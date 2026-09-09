process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://fcr_app:postgres@localhost:5432/fcr_scs?schema=public";

import { calculateRequiredSignatures, getAllCases } from "../services/payment.service";
import { prisma } from "../prisma";
import { CaseStatus, PaymentStatus } from "@prisma/client";

describe("calculateRequiredSignatures — tiered multi-sig formula with GA cap", () => {
  it("returns 2 base signatures for amounts under RM 1,000,000", () => {
    expect(calculateRequiredSignatures(0, 5)).toBe(2);
    expect(calculateRequiredSignatures(500_000, 5)).toBe(2);
    expect(calculateRequiredSignatures(999_999, 5)).toBe(2);
  });

  it("returns 3 signatures for amounts >= RM 1,000,000 and < RM 5,000,000", () => {
    expect(calculateRequiredSignatures(1_000_000, 5)).toBe(3);
    expect(calculateRequiredSignatures(2_000_000, 5)).toBe(3);
    expect(calculateRequiredSignatures(4_999_999, 5)).toBe(3);
  });

  it("adds +1 signature per RM 5,000,000 starting from RM 5,000,000", () => {
    // 5M -> base 2 + 1 (>=1M) + 1 (5M/5M) = 4
    expect(calculateRequiredSignatures(5_000_000, 10)).toBe(4);
    // 10M -> base 2 + 1 + 2 = 5
    expect(calculateRequiredSignatures(10_000_000, 10)).toBe(5);
    // 15M -> base 2 + 1 + 3 = 6
    expect(calculateRequiredSignatures(15_000_000, 10)).toBe(6);
    // 20M -> base 2 + 1 + 4 = 7
    expect(calculateRequiredSignatures(20_000_000, 10)).toBe(7);
    // 25M -> base 2 + 1 + 5 = 8
    expect(calculateRequiredSignatures(25_000_000, 10)).toBe(8);
  });

  it("caps required signatures at totalActiveGAs", () => {
    // RM 26,000,000 requires 8 uncapped, but caps at 5 active GAs
    expect(calculateRequiredSignatures(26_000_000, 5)).toBe(5);
    // If only 2 GAs active, caps at 2
    expect(calculateRequiredSignatures(10_000_000, 2)).toBe(2);
  });
});

describe("Dynamic Payment Ingestion from OFFER_ACCEPTED", () => {
  let createdCaseId: string;
  let testProjectId: string;

  beforeAll(async () => {
    // Find or create project
    const project = await prisma.project.findFirst({ select: { projectId: true, createdById: true } });
    if (project) {
      testProjectId = project.projectId;
    }
  });

  afterEach(async () => {
    if (createdCaseId) {
      await prisma.paymentAuthorisation.deleteMany({
        where: { paymentCase: { caseId: createdCaseId } },
      });
      await prisma.failedTransaction.deleteMany({
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

  it("dynamically ingests paymentCase when an acquisitionCase is in OFFER_ACCEPTED status", async () => {
    if (!testProjectId) return;

    const user = await prisma.user.findFirst({ select: { userId: true } });
    if (!user) return;

    createdCaseId = `INGEST-${Date.now()}`;
    await prisma.acquisitionCase.create({
      data: {
        caseId: createdCaseId,
        projectId: testProjectId,
        caseTitle: "Dynamic Ingestion Test Case",
        status: CaseStatus.OFFER_ACCEPTED,
        registrationDate: new Date(),
        remarks: "Test case for dynamic payment ingestion",
        createdById: user.userId,
      },
    });

    // Before calling getAllCases, verify no payment case exists for this caseId
    const beforePmt = await prisma.paymentCase.findUnique({
      where: { caseId: createdCaseId },
    });
    expect(beforePmt).toBeNull();

    // Call getAllCases() — this should trigger sync
    const all = await getAllCases();
    const found = all.find((c) => c.caseId === createdCaseId);
    expect(found).toBeDefined();
    expect(found!.status).toBe(PaymentStatus.OFFER_ACCEPTED);

    // Verify record in database
    const inDb = await prisma.paymentCase.findUnique({
      where: { caseId: createdCaseId },
    });
    expect(inDb).not.toBeNull();
    expect(inDb!.status).toBe(PaymentStatus.OFFER_ACCEPTED);
  });
});
