process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://fcr_app:postgres@localhost:5432/fcr_scs?schema=public";

import request from "supertest";
import { app } from "../index";
import { prisma } from "../prisma";

/**
 * Signature model (admin UX requirement):
 *  - the bank initiator always contributes 1 signature
 *  - admin approvals add the rest: required = 1 + (1 + floor(amount / 1_000_000))
 *  - the initiating admin can no longer count their own signature as an approval
 *  - 1_000_000 → required 3 (1 bank + 2 approvals), "2 left" after initiation
 */
describe("Signature model — bank initiator (1) + N admin approvals", () => {
  let createdCaseId = "";

  const makeCase = async (amount: number) => {
    const pc = await prisma.paymentCase.create({
      data: {
        caseId: `SIG-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        beneficiaryId: "BEN-TEST",
        amount,
        bankName: "Maybank",
        accountHolderName: "Test Beneficiary",
        status: "Approved",
        requiredSignatures: 0,
        currentSignatures: 0,
      },
    });
    createdCaseId = pc.caseId;
    return pc;
  };

  afterEach(async () => {
    if (createdCaseId) {
      await prisma.paymentCase.update({
        where: { caseId: createdCaseId },
        data: { deletedAt: new Date() },
      });
      createdCaseId = "";
    }
  });

  it("initiating 1M requires 3 signatures total (bank 1 + 2 approvals), current becomes 1", async () => {
    await makeCase(1_000_000);
    const r = await request(app)
      .post("/api/payments/initiate")
      .send({ caseId: createdCaseId, adminId: "admin-01" });
    expect(r.status).toBe(200);
    expect(r.body.paymentCase.status).toBe("Transfer Initiated");
    expect(r.body.paymentCase.requiredSignatures).toBe(3);
    expect(r.body.paymentCase.currentSignatures).toBe(1);
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

  it("1M: first approval leaves signatures outstanding (Authorised), second reaches total and pays", async () => {
    await makeCase(1_000_000);
    await request(app)
      .post("/api/payments/initiate")
      .send({ caseId: createdCaseId, adminId: "admin-01" });

    const first = await request(app)
      .post("/api/payments/authorise")
      .send({ caseId: createdCaseId, adminId: "admin-02" });
    expect(first.status).toBe(200);
    expect(first.body.paymentCase.currentSignatures).toBe(2);
    expect(first.body.paymentCase.status).toBe("Authorised");

    const second = await request(app)
      .post("/api/payments/authorise")
      .send({ caseId: createdCaseId, adminId: "admin-03" });
    expect(second.status).toBe(200);
    expect(second.body.paymentCase.currentSignatures).toBe(3);
    expect(second.body.paymentCase.status).toBe("Paid");
  });

  it("pending authorisations include partially-authorised (Authorised) cases", async () => {
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
    expect(found.status).toBe("Authorised");
  });
});
