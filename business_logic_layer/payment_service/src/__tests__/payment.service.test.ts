process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://fcr_app:postgres@localhost:5432/fcr_scs?schema=public";

import {
  calculateRequiredSignatures,
  getAllCases,
  submitBankDetails,
  saveMemberBankDetails,
  getSavedBankDetails,
  formatPaymentResponse,
} from "../services/payment.service";
import { prisma } from "../prisma";
import { CaseStatus, PaymentStatus } from "@prisma/client";
import { inflateSync } from "zlib";
import { generateReceipt } from "../services/receipt.service";

describe("formatPaymentResponse — GA audit trail ordering", () => {
  it("returns authorisations sorted by createdAt ascending regardless of input order", () => {
    const out = formatPaymentResponse({
      id: "PMT-1",
      caseId: "CASE-1",
      authorisations: [
        { adminId: "ga5", action: "reject", createdAt: new Date("2026-09-15T19:13:00Z") },
        { adminId: "ga3", action: "initiate", createdAt: new Date("2026-09-15T18:14:00Z") },
        { adminId: "ga2", action: "mark_resolved", createdAt: new Date("2026-09-15T19:12:00Z") },
        { adminId: "ga1", action: "authorise", createdAt: new Date("2026-09-15T18:14:30Z") },
      ],
    } as never) as never as { authorisations: Array<{ adminId: string }> };

    expect(out.authorisations.map((a) => a.adminId)).toEqual(["ga3", "ga1", "ga2", "ga5"]);
  });

  it("leaves payloads without authorisations untouched", () => {
    const out = formatPaymentResponse({ id: "PMT-2", caseId: "CASE-2" } as never);
    expect((out as never as Record<string, unknown>).authorisations).toBeUndefined();
  });
});

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
      await prisma.blockchainRecord.deleteMany({
        where: { caseId: createdCaseId },
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
    expect(found!.status).toBe(PaymentStatus.BANK_DETAILS_AND_M1_PENDING);

    // Verify record in database
    const inDb = await prisma.paymentCase.findUnique({
      where: { caseId: createdCaseId },
    });
    expect(inDb).not.toBeNull();
    expect(inDb!.status).toBe(PaymentStatus.BANK_DETAILS_AND_M1_PENDING);
  });
});

describe("Bank Account Uniqueness & Decoupled Profile Storage", () => {
  const testCaseId1 = `TEST-CASE-UNIQ-1-${Date.now()}`;
  const testCaseId2 = `TEST-CASE-UNIQ-2-${Date.now()}`;
  const testCaseId3 = `TEST-CASE-UNIQ-3-${Date.now()}`;
  const uniqueAcc = "888899990123";
  const member1MyKad = "900101145555";
  const member2MyKad = "910202146666";

  let testLandOwnerId: string;
  let testProjectId: string;
  let testCreatedById: string;

  beforeAll(async () => {
    const existingAc = await prisma.acquisitionCase.findFirst();
    testProjectId = existingAc!.projectId;
    testCreatedById = existingAc!.createdById;

    const landowners = await prisma.landOwner.findMany({ take: 2 });
    testLandOwnerId = landowners[0].ownerId;
    let testLandOwnerId2 = landowners.length > 1 ? landowners[1].ownerId : null;
    if (!testLandOwnerId2) {
      const newLo = await prisma.landOwner.create({
        data: {
          name: "Member 2 Test",
          nric: member2MyKad,
          address: "No 2 Test Address",
          contact: "0198765432",
          email: `member2.${Date.now()}@example.com`,
          createdById: testCreatedById,
        },
      });
      testLandOwnerId2 = newLo.ownerId;
    }

    for (const cid of [testCaseId1, testCaseId2, testCaseId3]) {
      await prisma.acquisitionCase.create({
        data: {
          caseId: cid,
          projectId: testProjectId,
          createdById: testCreatedById,
          caseTitle: `Uniqueness Test ${cid}`,
          status: CaseStatus.OFFER_ACCEPTED,
          registrationDate: new Date(),
          remarks: "Test case",
        },
      });
    }

    await prisma.paymentCase.createMany({
      data: [
        {
          id: `PMT-${testCaseId1}`,
          caseId: testCaseId1,
          beneficiaryId: testLandOwnerId,
          amount: 50000,
          status: PaymentStatus.BANK_DETAILS_PENDING,
        },
        {
          id: `PMT-${testCaseId2}`,
          caseId: testCaseId2,
          beneficiaryId: testLandOwnerId2,
          amount: 60000,
          status: PaymentStatus.BANK_DETAILS_PENDING,
        },
        {
          id: `PMT-${testCaseId3}`,
          caseId: testCaseId3,
          beneficiaryId: testLandOwnerId,
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
    await prisma.acquisitionCase.deleteMany({
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
    expect(res.status).toBe(PaymentStatus.AWARD_NOTARIZATION_PENDING);
  });

  it("rejects Member 2 when attempting to register Member 1's bank account number at the SAME bank", async () => {
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

  it("allows Member 2 to register the same account number at a DIFFERENT bank institution", async () => {
    const res = await submitBankDetails({
      caseId: testCaseId2,
      bankName: "Alliance Bank Malaysia Berhad",
      accountNumber: uniqueAcc,
      accountHolderName: "Member 2",
      phoneNumber: "0198765432",
      myKadNumber: member2MyKad,
    });
    expect(res.accountNumber).toBe(uniqueAcc);
    expect(res.bankName).toBe("Alliance Bank Malaysia Berhad");
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
    expect(res.status).toBe(PaymentStatus.AWARD_NOTARIZATION_PENDING);
  });

  it("saveMemberBankDetails does NOT prematurely mutate unsubmitted PaymentCase records", async () => {
    const pendingCaseId = `TEST-PENDING-${Date.now()}`;
    const existingAc = await prisma.acquisitionCase.findFirst();
    const lo = await prisma.landOwner.findFirst();

    await prisma.acquisitionCase.create({
      data: {
        caseId: pendingCaseId,
        projectId: existingAc!.projectId,
        createdById: existingAc!.createdById,
        caseTitle: `Pending Test ${pendingCaseId}`,
        status: CaseStatus.OFFER_ACCEPTED,
        registrationDate: new Date(),
        remarks: "Test case",
      },
    });

    await prisma.paymentCase.create({
      data: {
        id: `PMT-${pendingCaseId}`,
        caseId: pendingCaseId,
        beneficiaryId: lo!.ownerId,
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
      await prisma.acquisitionCase.deleteMany({ where: { caseId: pendingCaseId } });
    }
  });

  it("does NOT overwrite saved default account when member submits another case using Enter Another Bank Account", async () => {
    const member = await prisma.user.findUnique({ where: { email: "m1@fcrscs.gov.my" } });
    expect(member).toBeDefined();

    const defaultAcc = "99" + Date.now().toString().slice(-11); // 13 digits for AmBank
    const anotherAcc = "88" + Date.now().toString().slice(-10); // 12 digits for Maybank

    // 1. Establish default saved account (AmBank)
    await saveMemberBankDetails(member!.userId, {
      bankName: "AmBank",
      accountNumber: defaultAcc,
      accountHolderName: "Member 1",
      phoneNumber: "0123456789",
      myKadNumber: member1MyKad,
    });

    const defaultCheck = await getSavedBankDetails(member!.userId, member1MyKad, "Member 1");
    expect(defaultCheck.length).toBeGreaterThan(0);
    expect(defaultCheck[0].bankName).toBe("AmBank");
    expect(defaultCheck[0].accountNumber).toBe(defaultAcc);

    // 2. Submit a new case using "Enter Another Bank Account" (Maybank)
    const subRes = await submitBankDetails({
      caseId: testCaseId1,
      bankName: "Maybank",
      accountNumber: anotherAcc,
      accountHolderName: "Member 1",
      phoneNumber: "0123456789",
      myKadNumber: member1MyKad,
      userId: member!.userId,
      isAnotherAccount: true,
    });
    expect(subRes.accountNumber).toBe(anotherAcc);
    expect(subRes.bankName).toBe("Maybank");

    // 3. Verify getSavedBankDetails STILL returns AmBank at index 0
    const afterSub = await getSavedBankDetails(member!.userId, member1MyKad, "Member 1");
    expect(afterSub[0].bankName).toBe("AmBank");
    expect(afterSub[0].accountNumber).toBe(defaultAcc);

    // 4. Verify memberPayoutDetail table STILL holds AmBank
    const payoutDetail = await prisma.memberPayoutDetail.findUnique({
      where: { userId: member!.userId },
    });
    expect(payoutDetail?.bankName).toBe("AmBank");
    expect(payoutDetail?.accountNumber).toBe(defaultAcc);
  });
});

describe("generateReceipt — 1-page guarantee and RENTAS RTGS branding", () => {
  const receiptCaseId = `RCPT-1PAGE-${Date.now()}`;

  beforeAll(async () => {
    const existingAc = await prisma.acquisitionCase.findFirst();
    const lo = await prisma.landOwner.findFirst();

    await prisma.acquisitionCase.create({
      data: {
        caseId: receiptCaseId,
        projectId: existingAc!.projectId,
        createdById: existingAc!.createdById,
        caseTitle: `Receipt Test ${receiptCaseId}`,
        status: CaseStatus.OFFER_ACCEPTED,
        registrationDate: new Date(),
        remarks: "Receipt test case",
      },
    });

    await prisma.paymentCase.create({
      data: {
        id: `PMT-${receiptCaseId}`,
        caseId: receiptCaseId,
        beneficiaryId: lo!.ownerId,
        accountHolderName: "Tan Ah Kow",
        bankName: "Malayan Banking Berhad",
        accountNumber: "1234567890",
        amount: 850000,
        status: PaymentStatus.TRANSFER_SUCCEED,
        receipt: {
          create: {
            id: `RCP-TEST-${Date.now()}`,
            bankReferenceNumber: "RENTAS-2026-09-0099",
            generatedAt: new Date("2026-09-13T09:41:00.000Z"),
          },
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.paymentReceipt.deleteMany({ where: { paymentCase: { caseId: receiptCaseId } } });
    await prisma.paymentCase.deleteMany({ where: { caseId: receiptCaseId } });
    await prisma.acquisitionCase.deleteMany({ where: { caseId: receiptCaseId } });
  });

  it("renders a valid PDF buffer with exactly 1 page and RENTAS branding", async () => {
    const buffer = await generateReceipt(receiptCaseId);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);

    const pdfStr = buffer.toString("latin1");
    // Verify RENTAS author in uncompressed metadata
    expect(pdfStr).toContain("RENTAS RTGS");

    // Standard PDF page object count check (/Type /Page and /Count 1)
    const pageMatches = pdfStr.match(/\/Type\s*\/Page\b/g);
    expect(pageMatches).not.toBeNull();
    expect(pageMatches!.length).toBe(1);
    expect(pdfStr).toContain("/Count 1");
  });

  it("no longer prints the on-chain anchor label on the receipt", async () => {
    const buffer = await generateReceipt(receiptCaseId);
    const text = extractReceiptText(buffer);
    // Assert the probe works before asserting absence, or a broken extractor
    // would make this test pass no matter what the template draws.
    expect(text).toContain("RENTAS CRYPTOGRAPHIC SEAL");
    expect(text).not.toContain("ETH SEPOLIA ANCHORED");
    expect(text).not.toContain("SEPOLIA ANCHORED");
  });
});

/**
 * Pulls the visible text out of a PDFKit-generated PDF. The content stream is
 * Flate-compressed and each text run is written as hex strings inside `TJ`
 * operators, so a raw substring search on the file bytes can never match — the
 * stream has to be inflated and each hex run decoded first.
 */
function extractReceiptText(buffer: Buffer): string {
  const stream = buffer.toString("latin1").match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
  if (!stream) return "";
  const inflated = inflateSync(Buffer.from(stream[1], "latin1")).toString("latin1");
  const runs: string[] = [];
  for (const block of inflated.match(/\[(.+?)\]\s*TJ/gs) ?? []) {
    const hexes = block.match(/<([0-9A-Fa-f]+)>/g) ?? [];
    runs.push(hexes.map((h) => Buffer.from(h.slice(1, -1), "hex").toString("latin1")).join(""));
  }
  return runs.join("\n");
}

