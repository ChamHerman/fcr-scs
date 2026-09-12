process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://fcr_app:postgres@localhost:5432/fcr_scs?schema=public";

import request from "supertest";
import { app } from "../index";
import { prisma } from "../prisma";
import { newPaymentId } from "../services/payment.service";
import { PaymentStatus, UserRole } from "@prisma/client";
import { getTestSessionToken, cleanupTestSessions } from "./testAuthHelper";

describe("POST /api/payments/cancel (RBAC & SOP Hardening)", () => {
  let createdCaseId: string;
  let gaToken: string;
  let sysAdminToken: string;

  beforeAll(async () => {
    gaToken = await getTestSessionToken(UserRole.GOVERNMENT_ADMINISTRATOR, 1, "cancel");
    sysAdminToken = await getTestSessionToken(UserRole.SYSTEM_ADMINISTRATOR, 1, "cancel");
  });

  afterAll(async () => {
    await cleanupTestSessions("cancel");
  });

  const makeCase = async (status: PaymentStatus) => {
    const pc = await prisma.paymentCase.create({
      data: {
        id: newPaymentId(),
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
      await prisma.failedTransaction.deleteMany({
        where: { paymentCase: { caseId: createdCaseId } },
      });
      await prisma.paymentAuthorisation.deleteMany({
        where: { paymentCase: { caseId: createdCaseId } },
      });
      await prisma.paymentCase.deleteMany({
        where: { caseId: createdCaseId },
      });
      createdCaseId = "";
    }
  });

  it("401 when request is unauthenticated", async () => {
    const r = await request(app)
      .post("/api/payments/cancel")
      .send({ caseId: "CASE-001", reason: "Test reason" });
    expect(r.status).toBe(401);
  });

  it("403 when System Administrator attempts cancellation (view-only)", async () => {
    await makeCase(PaymentStatus.BANK_DETAILS_PENDING);
    const r = await request(app)
      .post("/api/payments/cancel")
      .set("Authorization", `Bearer ${sysAdminToken}`)
      .send({ caseId: createdCaseId, reason: "Unauthorized attempt" });
    expect(r.status).toBe(403);
    expect(r.body.error).toMatch(/view-only/i);
  });

  it("400 when caseId is missing", async () => {
    const r = await request(app)
      .post("/api/payments/cancel")
      .set("Authorization", `Bearer ${gaToken}`)
      .send({ reason: "Wrong beneficiary" });
    expect(r.status).toBe(400);
  });

  it("400 when reason is missing", async () => {
    const r = await request(app)
      .post("/api/payments/cancel")
      .set("Authorization", `Bearer ${gaToken}`)
      .send({ caseId: "CASE-001" });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/reason/i);
  });

  it("404 for non-existent case", async () => {
    const r = await request(app)
      .post("/api/payments/cancel")
      .set("Authorization", `Bearer ${gaToken}`)
      .send({ caseId: "NONEXISTENT", reason: "Test" });
    expect(r.status).toBe(404);
  });

  it("400 when the case is not in a pre-transfer state", async () => {
    await makeCase(PaymentStatus.PAID);
    const r = await request(app)
      .post("/api/payments/cancel")
      .set("Authorization", `Bearer ${gaToken}`)
      .send({ caseId: createdCaseId, reason: "Too late" });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/cancel/i);
  });

  it("400 when the case is waiting for bank approval (the bank owns it)", async () => {
    await makeCase(PaymentStatus.BANK_APPROVAL_PENDING);
    const r = await request(app)
      .post("/api/payments/cancel")
      .set("Authorization", `Bearer ${gaToken}`)
      .send({ caseId: createdCaseId, reason: "Too late" });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/cancel/i);
  });

  it("200 cancels a Bank Details Pending case, writes audit row, creates FailedTransaction, status becomes CANCELLED", async () => {
    await makeCase(PaymentStatus.BANK_DETAILS_PENDING);
    const r = await request(app)
      .post("/api/payments/cancel")
      .set("Authorization", `Bearer ${gaToken}`)
      .send({
        caseId: createdCaseId,
        reason: "LANDOWNER_REQUESTED_ACCOUNT_CHANGE",
      });
    expect(r.status).toBe(200);
    expect(r.body.paymentCase.status).toBe(PaymentStatus.CANCELLED);

    // Verify audit log
    const audit = await prisma.paymentAuthorisation.findFirst({
      where: { paymentCaseId: r.body.paymentCase.id, action: "cancel" },
    });
    expect(audit).not.toBeNull();
    expect(audit!.reason).toMatch(/Landowner requested bank account change/i);

    // Verify failed transaction entry created for SOP tracking
    const failedTx = await prisma.failedTransaction.findFirst({
      where: { paymentCaseId: r.body.paymentCase.id },
    });
    expect(failedTx).not.toBeNull();
    expect(failedTx!.errorLog).toMatch(/CANCELLED:.*Landowner requested bank account change/i);
  });
});
