process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://fcr_app:postgres@localhost:5432/fcr_scs?schema=public";

import {
  calculateRequiredSignatures,
  getAllCases,
  submitBankDetails,
  saveMemberBankDetails,
  getSavedBankDetails,
} from "../services/payment.service";
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
    expect(found!.status).toBe(PaymentStatus.BANK_DETAILS_PENDING);

    // Verify record in database
    const inDb = await prisma.paymentCase.findUnique({
      where: { caseId: createdCaseId },
    });
    expect(inDb).not.toBeNull();
    expect(inDb!.status).toBe(PaymentStatus.BANK_DETAILS_PENDING);
  });
});

describe("Bank Account Uniqueness & Decoupled Profile Storage", () => {
  const testCaseId1 = `TEST-CASE-UNIQ-1-${Date.now()}`;
  const testCaseId2 = `TEST-CASE-UNIQ-2-${Date.now()}`;
  const testCaseId3 = `TEST-CASE-UNIQ-3-${Date.now()}`;
  const uniqueAcc = "8888999901";
  const member1MyKad = "900101145555";
  const member2MyKad = "910202146666";

  beforeAll(async () => {
    await prisma.paymentCase.createMany({
      data: [
        {
          id: `PMT-${testCaseId1}`,
          caseId: testCaseId1,
          beneficiaryId: "BEN-1",
          amount: 50000,
          status: PaymentStatus.BANK_DETAILS_PENDING,
        },
        {
          id: `PMT-${testCaseId2}`,
          caseId: testCaseId2,
          beneficiaryId: "BEN-2",
          amount: 60000,
          status: PaymentStatus.BANK_DETAILS_PENDING,
        },
        {
          id: `PMT-${testCaseId3}`,
          caseId: testCaseId3,
          beneficiaryId: "BEN-1",
          amount: 70000,
          status: PaymentStatus.BANK_DETAILS_PENDING,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.receiverBankDetails.deleteMany({
      where: { paymentCaseId: { in: [`PMT-${testCaseId1}`, `PMT-${testCaseId2}`, `PMT-${testCaseId3}`] } },
    });
    await prisma.paymentCase.deleteMany({
      where: { caseId: { in: [testCaseId1, testCaseId2, testCaseId3] } },
    });
  });

  it("allows Member 1 to submit bank details on Case 1", async () => {
    const res = await submitBankDetails({
      caseId: testCaseId1,
      bankName: "Maybank",
      accountNumber: uniqueAcc,
      accountHolderName: "Member 1",
      phoneNumber: "0123456789",
      myKadNumber: member1MyKad,
    });
    expect(res.accountNumber).toBe(uniqueAcc);
    expect(res.status).toBe(PaymentStatus.READY_TO_INITIATE);
  });

  it("rejects Member 2 when attempting to register Member 1's bank account number", async () => {
    await expect(
      submitBankDetails({
        caseId: testCaseId2,
        bankName: "Maybank",
        accountNumber: uniqueAcc,
        accountHolderName: "Member 2",
        phoneNumber: "0198765432",
        myKadNumber: member2MyKad,
      })
    ).rejects.toThrow(
      "This bank account number is already registered by another beneficiary. Bank accounts must be unique to the registered MyKad holder."
    );
  });

  it("allows Member 1 to reuse the same bank account on Case 3", async () => {
    const res = await submitBankDetails({
      caseId: testCaseId3,
      bankName: "Maybank",
      accountNumber: uniqueAcc,
      accountHolderName: "Member 1",
      phoneNumber: "0123456789",
      myKadNumber: member1MyKad,
    });
    expect(res.accountNumber).toBe(uniqueAcc);
    expect(res.status).toBe(PaymentStatus.READY_TO_INITIATE);
  });

  it("saveMemberBankDetails does NOT prematurely mutate unsubmitted PaymentCase records", async () => {
    const pendingCaseId = `TEST-PENDING-${Date.now()}`;
    await prisma.paymentCase.create({
      data: {
        id: `PMT-${pendingCaseId}`,
        caseId: pendingCaseId,
        beneficiaryId: "BEN-PENDING",
        amount: 30000,
        status: PaymentStatus.BANK_DETAILS_PENDING,
      },
    });

    try {
      const saved = await saveMemberBankDetails("fake-user-id-pending", {
        bankName: "CIMB Bank",
        accountNumber: "7777666655",
        accountHolderName: "Pending User",
        phoneNumber: "0112233445",
        myKadNumber: "880808148888",
      });
      expect(saved.accountNumber).toBe("7777666655");
      expect(saved.verified).toBe(true);

      // Verify the unsubmitted case STILL has null bank details
      const checkCase = await prisma.paymentCase.findUnique({
        where: { caseId: pendingCaseId },
      });
      expect(checkCase?.bankName).toBeNull();
      expect(checkCase?.accountNumber).toBeNull();
      expect(checkCase?.status).toBe(PaymentStatus.BANK_DETAILS_PENDING);
    } finally {
      await prisma.paymentCase.deleteMany({ where: { caseId: pendingCaseId } });
    }
  });
});
