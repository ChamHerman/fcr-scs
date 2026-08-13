process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://fcr_app:postgres@localhost:5432/fcr_scs?schema=public";

import request from "supertest";
import { app } from "../index";
import { prisma } from "../prisma";

/**
 * Cancel Payment (new requirement, PLAN_HM_1308 §5.1 / §7.4):
 *  - mandatory reason (400 when missing)
 *  - only pre-transfer states may be cancelled
 *  - writes an Approval(action="cancel") audit row and flips status to CANCELLED
 */
describe("POST /api/payments/cancel", () => {
  let createdCaseId: string;

  const makeCase = async (status: string) => {
    const pc = await prisma.paymentCase.create({
      data: {
        caseId: `CANCEL-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        beneficiaryId: "BEN-TEST",
        amount: 500000,
        bankName: "Maybank",
        accountHolderName: "Test Beneficiary",
        status,
        requiredSignatures: 1,
        currentSignatures: 0,
      },
    });
    createdCaseId = pc.caseId;
    return pc;
  };

  afterEach(async () => {
    if (createdCaseId) {
      // Soft-delete the fixture row so later runs start clean.
      await prisma.paymentCase.update({
        where: { caseId: createdCaseId },
        data: { deletedAt: new Date() },
      });
      createdCaseId = "";
    }
  });

  it("400 when caseId is missing", async () => {
    const r = await request(app)
      .post("/api/payments/cancel")
      .send({ adminId: "admin-01", reason: "Wrong beneficiary" });
    expect(r.status).toBe(400);
  });

  it("400 when reason is missing", async () => {
    const r = await request(app)
      .post("/api/payments/cancel")
      .send({ caseId: "CASE-001", adminId: "admin-01" });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/reason/i);
  });

  it("404 for non-existent case", async () => {
    const r = await request(app)
      .post("/api/payments/cancel")
      .send({ caseId: "NONEXISTENT", adminId: "admin-01", reason: "Test" });
    expect(r.status).toBe(404);
  });

  it("400 when the case is not in a pre-transfer state", async () => {
    await makeCase("Paid");
    const r = await request(app)
      .post("/api/payments/cancel")
      .send({ caseId: createdCaseId, adminId: "admin-01", reason: "Too late" });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/cancel/i);
  });

  it("200 cancels an Approved case, writes audit row, status becomes CANCELLED", async () => {
    await makeCase("Approved");
    const r = await request(app)
      .post("/api/payments/cancel")
      .send({ caseId: createdCaseId, adminId: "admin-01", reason: "Duplicate entry" });
    expect(r.status).toBe(200);
    expect(r.body.paymentCase.status).toBe("CANCELLED");

    const audit = await prisma.paymentAuthorisation.findFirst({
      where: { paymentCaseId: r.body.paymentCase.id, action: "cancel" },
    });
    expect(audit).not.toBeNull();
    expect(audit!.adminId).toBe("admin-01");
    expect(audit!.reason).toBe("Duplicate entry");
  });
});
