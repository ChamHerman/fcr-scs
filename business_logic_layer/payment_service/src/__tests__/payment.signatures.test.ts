process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://fcr_app:postgres@localhost:5432/fcr_scs?schema=public";

import request from "supertest";
import { app } from "../index";
import { prisma } from "../prisma";
import { newPaymentId } from "../services/payment.service";
import { PaymentStatus, UserRole } from "@prisma/client";
import { getTestSessionToken, cleanupTestSessions } from "./testAuthHelper";

describe("Signature model & Final Execution Confirmation", () => {
  let createdCaseId = "";
  let ga1Token: string;
  let ga2Token: string;
  let ga3Token: string;

  beforeAll(async () => {
    ga1Token = await getTestSessionToken(UserRole.GOVERNMENT_ADMINISTRATOR, 1, "sig");
    ga2Token = await getTestSessionToken(UserRole.GOVERNMENT_ADMINISTRATOR, 2, "sig");
    ga3Token = await getTestSessionToken(UserRole.GOVERNMENT_ADMINISTRATOR, 3, "sig");
  });

  afterAll(async () => {
    await cleanupTestSessions("sig");
  });

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

  it("initiating 1M requires 3 signatures total (1 initiator + 2 approvals); record id is short PMT-XXXXXXXX", async () => {
    await makeCase(1_000_000);
    const r = await request(app)
      .post("/api/payments/initiate")
      .set("Authorization", `Bearer ${ga1Token}`)
      .send({ caseId: createdCaseId });
    expect(r.status).toBe(200);
    expect(r.body.paymentCase.status).toBe(PaymentStatus.TRANSFER_INITIATED);
    expect(r.body.paymentCase.requiredSignatures).toBe(3);
    expect(r.body.paymentCase.currentSignatures).toBe(1);
    expect(r.body.paymentCase.paymentId).toMatch(/^PMT-[A-Z0-9]{8}$/);
    expect(r.body.paymentCase.paymentId).toBe(r.body.paymentCase.id);
  });

  it("small payment (< 1M) needs 2 total — 1 left after initiation", async () => {
    await makeCase(100_000);
    const r = await request(app)
      .post("/api/payments/initiate")
      .set("Authorization", `Bearer ${ga1Token}`)
      .send({ caseId: createdCaseId });
    expect(r.status).toBe(200);
    expect(r.body.paymentCase.requiredSignatures).toBe(2);
    expect(r.body.paymentCase.currentSignatures).toBe(1);
    expect(r.body.paymentCase.requiredSignatures - r.body.paymentCase.currentSignatures).toBe(1);
  });

  it("the initiator cannot sign/approve their own initiation (Segregation of Duties)", async () => {
    await makeCase(1_000_000);
    await request(app)
      .post("/api/payments/initiate")
      .set("Authorization", `Bearer ${ga1Token}`)
      .send({ caseId: createdCaseId });

    const r = await request(app)
      .post("/api/payments/authorise")
      .set("Authorization", `Bearer ${ga1Token}`)
      .send({ caseId: createdCaseId });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/segregation/i);
  });

  it("an approver cannot double-sign (Segregation of Duties)", async () => {
    await makeCase(1_000_000);
    await request(app)
      .post("/api/payments/initiate")
      .set("Authorization", `Bearer ${ga1Token}`)
      .send({ caseId: createdCaseId });

    const r1 = await request(app)
      .post("/api/payments/authorise")
      .set("Authorization", `Bearer ${ga2Token}`)
      .send({ caseId: createdCaseId });
    expect(r1.status).toBe(200);

    const r2 = await request(app)
      .post("/api/payments/authorise")
      .set("Authorization", `Bearer ${ga2Token}`)
      .send({ caseId: createdCaseId });
    expect(r2.status).toBe(400);
    expect(r2.body.error).toMatch(/segregation/i);
  });

  it("1M: partial signatures stay Transfer Initiated; final signature marks AUTHORISED; remains on hold until explicit confirmExecution", async () => {
    await makeCase(1_000_000);
    await request(app)
      .post("/api/payments/initiate")
      .set("Authorization", `Bearer ${ga1Token}`)
      .send({ caseId: createdCaseId });

    const first = await request(app)
      .post("/api/payments/authorise")
      .set("Authorization", `Bearer ${ga2Token}`)
      .send({ caseId: createdCaseId });
    expect(first.status).toBe(200);
    expect(first.body.paymentCase.currentSignatures).toBe(2);
    expect(first.body.paymentCase.status).toBe(PaymentStatus.TRANSFER_INITIATED);

    const second = await request(app)
      .post("/api/payments/authorise")
      .set("Authorization", `Bearer ${ga3Token}`)
      .send({ caseId: createdCaseId });
    expect(second.status).toBe(200);
    expect(second.body.paymentCase.currentSignatures).toBe(3);
    expect(second.body.paymentCase.status).toBe(PaymentStatus.AUTHORISED);

    // CRITICAL: Remains in AUTHORISED; bank queue does NOT have this case
    const bankPendingBefore = await request(app).get("/api/payments/bank/pending");
    expect(bankPendingBefore.body.cases.find((c: { caseId: string }) => c.caseId === createdCaseId)).toBeUndefined();

    // Initiator (GA1) cannot confirm execution (must be an authoriser)
    const badConfirm = await request(app)
      .post("/api/payments/confirm-execution")
      .set("Authorization", `Bearer ${ga1Token}`)
      .send({ caseId: createdCaseId });
    expect(badConfirm.status).toBe(400);
    expect(badConfirm.body.error).toMatch(/authorising/i);

    // Final authoriser (GA3) confirms execution
    const goodConfirm = await request(app)
      .post("/api/payments/confirm-execution")
      .set("Authorization", `Bearer ${ga3Token}`)
      .send({ caseId: createdCaseId });
    expect(goodConfirm.status).toBe(200);

    // Now it appears in the bank portal queue
    const bankPendingAfter = await request(app).get("/api/payments/bank/pending");
    expect(bankPendingAfter.body.cases.find((c: { caseId: string }) => c.caseId === createdCaseId)).toBeDefined();

    // Bank clears the transfer
    const bankApprove = await request(app)
      .post("/api/payments/bank/approve")
      .send({ caseId: createdCaseId, bankReferenceNumber: "BNK-TEST-REF" });
    expect(bankApprove.status).toBe(200);
    expect(bankApprove.body.paymentCase.status).toBe(PaymentStatus.PAID);
    expect(bankApprove.body.paymentCase.receipt).toBeDefined();
  });

  it("pending authorisations include partially-signed (Transfer Initiated) cases", async () => {
    await makeCase(1_000_000);
    await request(app)
      .post("/api/payments/initiate")
      .set("Authorization", `Bearer ${ga1Token}`)
      .send({ caseId: createdCaseId });

    const r = await request(app)
      .get("/api/payments/pending-authorisations")
      .set("Authorization", `Bearer ${ga1Token}`);
    expect(r.status).toBe(200);
    const found = r.body.cases.find((c: { caseId: string }) => c.caseId === createdCaseId);
    expect(found).toBeDefined();
    expect(found.status).toBe(PaymentStatus.TRANSFER_INITIATED);
  });
});
