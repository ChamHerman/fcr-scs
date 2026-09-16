process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://fcr_app:postgres@localhost:5432/fcr_scs?schema=public";

import request from "supertest";
import { app } from "../index";
import { prisma } from "../prisma";
import { newPaymentId } from "../services/payment.service";
import { PaymentStatus, UserRole } from "@prisma/client";
import { getTestSessionToken, cleanupTestSessions } from "./testAuthHelper";

/**
 * Regression guard for the Failed Transactions modal bug (2026-09-15):
 * getFailedTransactions() was the only read path that skipped
 * enrichPaymentWithAdminNames(), so every audit event reached the frontend
 * with a raw UUID adminId and rendered as the fallback "Gov Admin 1".
 */
describe("GET /api/payments/failed (admin name enrichment)", () => {
  let createdCaseId: string;
  let createdPaymentCaseId: string;
  let gaToken: string;
  let ga1: { userId: string; name: string };
  let ga2: { userId: string; name: string };
  let testLandOwnerId: string;
  let testProjectId: string;
  let testCreatedById: string;

  beforeAll(async () => {
    gaToken = await getTestSessionToken(UserRole.GOVERNMENT_ADMINISTRATOR, 1, "failedtx");
    const [u1, u2] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { email: "ga1@fcrscs.gov.my" },
        select: { userId: true, name: true },
      }),
      prisma.user.findUniqueOrThrow({
        where: { email: "ga2@fcrscs.gov.my" },
        select: { userId: true, name: true },
      }),
    ]);
    ga1 = u1;
    ga2 = u2;

    const existingAc = await prisma.acquisitionCase.findFirst();
    testProjectId = existingAc!.projectId;
    testCreatedById = existingAc!.createdById;

    const lo = await prisma.landOwner.findFirst();
    testLandOwnerId = lo!.ownerId;
  });

  afterAll(async () => {
    if (createdCaseId) {
      await prisma.paymentCase.deleteMany({ where: { caseId: createdCaseId } });
      await prisma.acquisitionCase.deleteMany({ where: { caseId: createdCaseId } });
      createdCaseId = "";
    }
    await cleanupTestSessions("failedtx");
  });

  it("returns authorisations enriched with the real adminName per event", async () => {
    const caseId = `FAILEDTX-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await prisma.acquisitionCase.create({
      data: {
        caseId,
        projectId: testProjectId,
        createdById: testCreatedById,
        caseTitle: "Failed Transactions Enrichment Test Case",
        status: "OFFER_ACCEPTED",
        registrationDate: new Date(),
        remarks: "Test case for /failed enrichment",
      },
    });
    const pc = await prisma.paymentCase.create({
      data: {
        id: await newPaymentId(),
        caseId,
        beneficiaryId: testLandOwnerId,
        amount: 250000,
        bankName: "Maybank",
        accountHolderName: "Enrichment Test Beneficiary",
        status: PaymentStatus.TRANSFER_REJECTED,
        requiredSignatures: 2,
        currentSignatures: 1,
      },
    });
    createdCaseId = caseId;
    createdPaymentCaseId = pc.id;
    await prisma.paymentAuthorisation.createMany({
      data: [
        { paymentCaseId: pc.id, adminId: ga1.userId, action: "initiate", cycle: 1 },
        {
          paymentCaseId: pc.id,
          adminId: ga2.userId,
          action: "reject",
          reason: "Award amount or supporting documents failed pre-disbursement verification",
          cycle: 1,
        },
      ],
    });

    const r = await request(app)
      .get("/api/payments/failed")
      .set("Authorization", `Bearer ${gaToken}`);
    expect(r.status).toBe(200);

    const row = r.body.cases.find((c: any) => c.caseId === caseId);
    expect(row).toBeDefined();
    const auths: any[] = row.authorisations;
    expect(auths.length).toBe(2);

    const initiate = auths.find((a) => a.action === "initiate");
    const reject = auths.find((a) => a.action === "reject");
    expect(initiate.adminName).toBe(ga1.name);
    expect(reject.adminName).toBe(ga2.name);
    expect(initiate.adminName).not.toBe(reject.adminName);
  });
});
