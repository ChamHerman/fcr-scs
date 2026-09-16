process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://fcr_app:postgres@localhost:5432/fcr_scs?schema=public";

import request from "supertest";
import { app } from "../index";
import { prisma } from "../prisma";
import { newPaymentId } from "../services/payment.service";
import { PaymentStatus, UserRole } from "@prisma/client";
import { getTestSessionToken, cleanupTestSessions } from "./testAuthHelper";

// Cancel is terminal (payment → CANCELLED, case → CASE_CLOSED) and reserved for
// cases the bank/governance already bounced. These are the current statutory keys.
const VALID_REASON = "ACQUISITION_DISCONTINUED";

describe("POST /api/payments/cancel (RBAC & SOP Hardening)", () => {
  let createdCaseId: string;
  let gaToken: string;
  let sysAdminToken: string;

  let testLandOwnerId: string;
  let testProjectId: string;
  let testCreatedById: string;

  beforeAll(async () => {
    gaToken = await getTestSessionToken(UserRole.GOVERNMENT_ADMINISTRATOR, 1, "cancel");
    sysAdminToken = await getTestSessionToken(UserRole.SYSTEM_ADMINISTRATOR, 1, "cancel");

    const existingAc = await prisma.acquisitionCase.findFirst();
    testProjectId = existingAc!.projectId;
    testCreatedById = existingAc!.createdById;

    const lo = await prisma.landOwner.findFirst();
    testLandOwnerId = lo!.ownerId;
  });

  afterAll(async () => {
    await cleanupTestSessions("cancel");
  });

  const makeCase = async (status: PaymentStatus) => {
    const caseId = `CANCEL-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await prisma.acquisitionCase.create({
      data: {
        caseId,
        projectId: testProjectId,
        createdById: testCreatedById,
        caseTitle: "Cancel Test Acquisition Case",
        status: "PAYMENT_IN_PROGRESS",
        registrationDate: new Date(),
        remarks: "Test case for cancel",
      },
    });
    const pc = await prisma.paymentCase.create({
      data: {
        id: await newPaymentId(),
        caseId,
        beneficiaryId: testLandOwnerId,
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
      await prisma.acquisitionCase.deleteMany({
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
    await makeCase(PaymentStatus.TRANSFER_REJECTED);
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
      .send({ reason: VALID_REASON });
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
      .send({ caseId: "NONEXISTENT", reason: VALID_REASON });
    expect(r.status).toBe(404);
  });

  it("400 when the case is still pre-initiation (Bank Details Pending) — cancel is rejected/failed only", async () => {
    await makeCase(PaymentStatus.BANK_DETAILS_PENDING);
    const r = await request(app)
      .post("/api/payments/cancel")
      .set("Authorization", `Bearer ${gaToken}`)
      .send({ caseId: createdCaseId, reason: VALID_REASON });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/Transfer Rejected or Transfer Failed/i);
  });

  it("400 when the case is awaiting approval (Pending Approval) — cancel is rejected/failed only", async () => {
    await makeCase(PaymentStatus.PENDING_APPROVAL);
    const r = await request(app)
      .post("/api/payments/cancel")
      .set("Authorization", `Bearer ${gaToken}`)
      .send({ caseId: createdCaseId, reason: VALID_REASON });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/Transfer Rejected or Transfer Failed/i);
  });

  it("400 when the case is already Paid", async () => {
    await makeCase(PaymentStatus.PAID);
    const r = await request(app)
      .post("/api/payments/cancel")
      .set("Authorization", `Bearer ${gaToken}`)
      .send({ caseId: createdCaseId, reason: VALID_REASON });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/cancel/i);
  });

  it("400 when the case is waiting for bank approval (the bank owns it)", async () => {
    await makeCase(PaymentStatus.BANK_APPROVAL_PENDING);
    const r = await request(app)
      .post("/api/payments/cancel")
      .set("Authorization", `Bearer ${gaToken}`)
      .send({ caseId: createdCaseId, reason: VALID_REASON });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/cancel/i);
  });

  it("400 when the reason is free-text instead of an approved statutory key", async () => {
    await makeCase(PaymentStatus.TRANSFER_REJECTED);
    const r = await request(app)
      .post("/api/payments/cancel")
      .set("Authorization", `Bearer ${gaToken}`)
      .send({ caseId: createdCaseId, reason: "idk" });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/approved statutory cancellation reason/i);
  });

  it("400 when the reason is a retired key (belongs to the old SOP vocabulary)", async () => {
    await makeCase(PaymentStatus.TRANSFER_REJECTED);
    const r = await request(app)
      .post("/api/payments/cancel")
      .set("Authorization", `Bearer ${gaToken}`)
      .send({ caseId: createdCaseId, reason: "DUPLICATE_DISBURSEMENT_PREVENTION" });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/approved statutory cancellation reason/i);
  });

  it("200 cancels a Transfer Rejected case: audit row, FailedTransaction, payment CANCELLED, case CASE_CLOSED", async () => {
    await makeCase(PaymentStatus.TRANSFER_REJECTED);
    const r = await request(app)
      .post("/api/payments/cancel")
      .set("Authorization", `Bearer ${gaToken}`)
      .send({ caseId: createdCaseId, reason: VALID_REASON });
    expect(r.status).toBe(200);
    expect(r.body.paymentCase.status).toBe(PaymentStatus.CANCELLED);

    // Verify audit log
    const audit = await prisma.paymentAuthorisation.findFirst({
      where: { paymentCaseId: r.body.paymentCase.id, action: "cancel" },
    });
    expect(audit).not.toBeNull();
    expect(audit!.reason).toMatch(/Land acquisition discontinued/i);

    // Verify failed transaction entry created for SOP tracking
    const failedTx = await prisma.failedTransaction.findFirst({
      where: { paymentCaseId: r.body.paymentCase.id },
    });
    expect(failedTx).not.toBeNull();
    expect(failedTx!.errorLog).toMatch(/CANCELLED:.*Land acquisition discontinued/i);

    // Cancelling is terminal: the statutory case closes.
    const ac = await prisma.acquisitionCase.findUnique({ where: { caseId: createdCaseId } });
    expect(ac!.status).toBe("CASE_CLOSED");
  });

  it("200 cancels a Transfer Failed case and leaves blockchain notarization untouched", async () => {
    await makeCase(PaymentStatus.TRANSFER_FAILED);
    const r = await request(app)
      .post("/api/payments/cancel")
      .set("Authorization", `Bearer ${gaToken}`)
      .send({ caseId: createdCaseId, reason: VALID_REASON });
    expect(r.status).toBe(200);
    expect(r.body.paymentCase.status).toBe(PaymentStatus.CANCELLED);

    const ac = await prisma.acquisitionCase.findUnique({ where: { caseId: createdCaseId } });
    expect(ac!.status).toBe("CASE_CLOSED");
  });
});
