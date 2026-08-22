process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://fcr_app:postgres@localhost:5432/fcr_scs?schema=public";

import request from "supertest";
import { app } from "../index";
import { prisma } from "../prisma";
import { newPaymentId, BANK_SUBMISSION_DELAY_MS } from "../services/payment.service";

import { PaymentStatus } from "@prisma/client";

/**
 * Signature model (admin UX requirement):
 *  - the bank initiator always contributes 1 signature
 *  - admin approvals add the rest: required = 1 + (1 + floor(amount / 1_000_000))
 *  - the initiating admin can no longer count their own signature as an approval
 *  - 1_000_000 → required 3 (1 bank + 2 approvals), "2 left" after initiation
 *  - partial signatures keep the case at TRANSFER_INITIATED; the final signature
 *    marks it AUTHORISED, and BANK_SUBMISSION_DELAY_MS later it auto-submits to
 *    the bank (WAITING_BANK_APPROVAL) — only then can the bank approve/reject.
 */
describe("Signature model — bank initiator (1) + N admin approvals", () => {
  let createdCaseId = "";

  const makeCase = async (amount: number) => {
    const pc = await prisma.paymentCase.create({
      data: {
        id: newPaymentId(),
        caseId: `SIG-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        beneficiaryId: "BEN-TEST",
        amount,
        bankName: "Maybank",
        accountHolderName: "Test Beneficiary",
        status: PaymentStatus.OFFER_ACCEPTED,
        requiredSignatures: 0,
        currentSignatures: 0,
      },
    });
    createdCaseId = pc.caseId;
    return pc;
  };

  afterEach(async () => {
    if (createdCaseId) {
      await prisma.paymentReceipt.deleteMany({
        where: { paymentCase: { caseId: createdCaseId } },
      });
      await prisma.paymentAuthorisation.deleteMany({
        where: { paymentCase: { caseId: createdCaseId } },
      });
      await prisma.failedTransaction.deleteMany({
        where: { paymentCase: { caseId: createdCaseId } },
      });
      await prisma.paymentCase.deleteMany({
        where: { caseId: createdCaseId },
      });
      createdCaseId = "";
    }
  });

  it("initiating 1M requires 3 signatures total (bank 1 + 2 approvals); record id is short PMT-XXXXXXXX", async () => {
    await makeCase(1_000_000);
    const r = await request(app)
      .post("/api/payments/initiate")
      .send({ caseId: createdCaseId, adminId: "admin-01" });
    expect(r.status).toBe(200);
    expect(r.body.paymentCase.status).toBe(PaymentStatus.TRANSFER_INITIATED);
    expect(r.body.paymentCase.requiredSignatures).toBe(3);
    expect(r.body.paymentCase.currentSignatures).toBe(1);
    expect(r.body.paymentCase.paymentId).toMatch(/^PMT-[A-Z0-9]{8}$/);
    expect(r.body.paymentCase.paymentId).toBe(r.body.paymentCase.id);
  });

  it("small payment needs 2 total — 1 left after initiation", async () => {
    await makeCase(100_000);
    const r = await request(app)
      .post("/api/payments/initiate")
      .send({ caseId: createdCaseId, adminId: "admin-01" });
    expect(r.body.paymentCase.requiredSignatures).toBe(2);
    expect(r.body.paymentCase.currentSignatures).toBe(1);
    expect(r.body.paymentCase.requiredSignatures - r.body.paymentCase.currentSignatures).toBe(1);
  });

  it("the initiator cannot sign/approve their own initiation (SoD)", async () => {
    await makeCase(1_000_000);
    await request(app)
      .post("/api/payments/initiate")
      .send({ caseId: createdCaseId, adminId: "admin-01" });
    const r = await request(app)
      .post("/api/payments/authorise")
      .send({ caseId: createdCaseId, adminId: "admin-01" });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/segregation/i);
  });

  it("1M: partial signatures stay Transfer Initiated; final signature authorises; after the delay the case is bank-submitted and only then can the bank approve", async () => {
    await makeCase(1_000_000);
    await request(app)
      .post("/api/payments/initiate")
      .send({ caseId: createdCaseId, adminId: "admin-01" });

    const first = await request(app)
      .post("/api/payments/authorise")
      .send({ caseId: createdCaseId, adminId: "admin-02" });
    expect(first.status).toBe(200);
    expect(first.body.paymentCase.currentSignatures).toBe(2);
    expect(first.body.paymentCase.status).toBe(PaymentStatus.TRANSFER_INITIATED);

    const second = await request(app)
      .post("/api/payments/authorise")
      .send({ caseId: createdCaseId, adminId: "admin-03" });
    expect(second.status).toBe(200);
    expect(second.body.paymentCase.currentSignatures).toBe(3);
    expect(second.body.paymentCase.status).toBe(PaymentStatus.AUTHORISED);

    // Not submitted to the bank yet — the bank queue ignores AUTHORISED cases
    const earlyList = await request(app).get("/api/payments/bank/pending");
    expect(earlyList.body.cases.find((c: { caseId: string }) => c.caseId === createdCaseId)).toBeUndefined();
    const earlyApprove = await request(app)
      .post("/api/payments/bank/approve")
      .send({ caseId: createdCaseId });
    expect(earlyApprove.status).toBe(400);

    // BANK_SUBMISSION_DELAY_MS later the case flips to WAITING_BANK_APPROVAL
    await new Promise((r) => setTimeout(r, BANK_SUBMISSION_DELAY_MS + 300));
    const after = await request(app).get(`/api/payments/status/${createdCaseId}`);
    expect(after.body.paymentCase.status).toBe(PaymentStatus.WAITING_BANK_APPROVAL);

    const pendingList = await request(app).get("/api/payments/bank/pending");
    expect(pendingList.body.cases.find((c: { caseId: string }) => c.caseId === createdCaseId)).toBeDefined();

    // Bank clearance simulator approve
    const bankApprove = await request(app)
      .post("/api/payments/bank/approve")
      .send({ caseId: createdCaseId, bankReferenceNumber: "BNK-TEST-REF" });
    expect(bankApprove.status).toBe(200);
    expect(bankApprove.body.paymentCase.status).toBe(PaymentStatus.PAID);
    expect(bankApprove.body.paymentCase.receipt).toBeDefined();
  }, 20000);

  it("stale AUTHORISED cases are swept into the bank queue on read; the bank can then reject them", async () => {
    await makeCase(100_000);
    await request(app)
      .post("/api/payments/initiate")
      .send({ caseId: createdCaseId, adminId: "admin-01" });
    const r = await request(app)
      .post("/api/payments/authorise")
      .send({ caseId: createdCaseId, adminId: "admin-02" });
    expect(r.body.paymentCase.status).toBe(PaymentStatus.AUTHORISED);

    // Simulate a restart inside the submission window: backdate updatedAt past the delay
    await prisma.paymentCase.update({
      where: { caseId: createdCaseId },
      data: { updatedAt: new Date(Date.now() - (BANK_SUBMISSION_DELAY_MS + 1000)) },
    });

    const pending = await request(app).get("/api/payments/bank/pending");
    const found = pending.body.cases.find((c: { caseId: string }) => c.caseId === createdCaseId);
    expect(found).toBeDefined();
    expect(found.status).toBe(PaymentStatus.WAITING_BANK_APPROVAL);

    const bankReject = await request(app)
      .post("/api/payments/bank/reject")
      .send({ caseId: createdCaseId, errorReason: "AML flag" });
    expect(bankReject.status).toBe(200);
    expect(bankReject.body.paymentCase.status).toBe(PaymentStatus.TRANSFER_FAILED);
  });

  it("an admin who already approved cannot reject (SoD); a fresh admin can reject while partially signed", async () => {
    await makeCase(1_000_000);
    await request(app)
      .post("/api/payments/initiate")
      .send({ caseId: createdCaseId, adminId: "admin-01" });
    await request(app)
      .post("/api/payments/authorise")
      .send({ caseId: createdCaseId, adminId: "admin-02" });

    const selfReject = await request(app)
      .post("/api/payments/reject")
      .send({ caseId: createdCaseId, adminId: "admin-02", reason: "Changed my mind" });
    expect(selfReject.status).toBe(400);
    expect(selfReject.body.error).toMatch(/segregation/i);

    const freshReject = await request(app)
      .post("/api/payments/reject")
      .send({ caseId: createdCaseId, adminId: "admin-04", reason: "Wrong beneficiary" });
    expect(freshReject.status).toBe(200);
    expect(freshReject.body.paymentCase.status).toBe(PaymentStatus.TRANSFER_REJECTED);
  });

  it("admin reject is refused once the case is waiting for bank approval (bank owns the decision)", async () => {
    await makeCase(100_000);
    await request(app)
      .post("/api/payments/initiate")
      .send({ caseId: createdCaseId, adminId: "admin-01" });
    await request(app)
      .post("/api/payments/authorise")
      .send({ caseId: createdCaseId, adminId: "admin-02" });
    await prisma.paymentCase.update({
      where: { caseId: createdCaseId },
      data: { status: PaymentStatus.WAITING_BANK_APPROVAL },
    });
    const r = await request(app)
      .post("/api/payments/reject")
      .send({ caseId: createdCaseId, adminId: "admin-03", reason: "Too late" });
    expect(r.status).toBe(400);
  });

  it("pending authorisations include partially-signed (Transfer Initiated) cases", async () => {
    await makeCase(1_000_000);
    await request(app)
      .post("/api/payments/initiate")
      .send({ caseId: createdCaseId, adminId: "admin-01" });
    await request(app)
      .post("/api/payments/authorise")
      .send({ caseId: createdCaseId, adminId: "admin-02" });

    const r = await request(app).get("/api/payments/pending-authorisations");
    expect(r.status).toBe(200);
    const found = r.body.cases.find((c: { caseId: string }) => c.caseId === createdCaseId);
    expect(found).toBeDefined();
    expect(found.status).toBe(PaymentStatus.TRANSFER_INITIATED);
  });
});
