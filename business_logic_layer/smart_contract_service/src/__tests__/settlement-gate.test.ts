process.env.ADMIN_WALLET_ADDRESS = "0xAdminWallet123";
process.env.DATABASE_URL = "postgresql://fcr_app:postgres@localhost:5432/fcr_scs?schema=public";
process.env.NODE_ENV = "test";

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import { BlockchainStatus, CaseStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "./testAuthHelper";

// publishRecord verifies the mined receipt on-chain before writing. These tests
// are about the PAID gate, not Sepolia.
jest.mock("../services/ethereum.service", () => ({
  getActiveContractAddress: jest.fn(() => "0xContractAddr"),
  verifyTransactionReceipt: jest.fn(async () => ({
    found: true,
    success: true,
    to: "0xcontractaddr",
  })),
}));

import { assertSettlementPaid, publishRecord } from "../services/blockchain.service";

const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
const CASE_PAID = `SETTLE-PAID-${stamp}`;
const CASE_SUCCEED = `SETTLE-SUCCEED-${stamp}`;
const CASE_NOPAY = `SETTLE-NOPAY-${stamp}`;
const ALL_CASES = [CASE_PAID, CASE_SUCCEED, CASE_NOPAY];

let beneficiaryId = "";

async function makeCase(caseId: string, status: CaseStatus) {
  const template = await prisma.acquisitionCase.findFirst();
  if (!template) throw new Error("An existing acquisition case is required as a FK parent");
  const firstOwner = await prisma.landOwner.findFirst({ select: { ownerId: true } });
  if (!firstOwner) throw new Error("A seeded land owner is required as a FK parent");
  beneficiaryId = firstOwner.ownerId;
  await prisma.acquisitionCase.create({
    data: {
      caseId,
      projectId: template.projectId,
      createdById: template.createdById,
      caseTitle: `Settlement Gate Test ${caseId}`,
      status,
      registrationDate: new Date(),
      remarks: "settlement-gate test",
    },
  });
}

async function makePaymentCase(caseId: string, status: PaymentStatus) {
  await prisma.paymentCase.create({
    data: {
      id: `PMT-TEST-${caseId}`,
      caseId,
      beneficiaryId,
      amount: 1000,
      status,
    },
  });
}

beforeAll(async () => {
  await makeCase(CASE_PAID, CaseStatus.PAYMENT_COMPLETED);
  await makeCase(CASE_SUCCEED, CaseStatus.PAYMENT_IN_PROGRESS);
  await makeCase(CASE_NOPAY, CaseStatus.PAYMENT_IN_PROGRESS);

  await makePaymentCase(CASE_PAID, PaymentStatus.PAID);
  await makePaymentCase(CASE_SUCCEED, PaymentStatus.TRANSFER_SUCCEED);
  // CASE_NOPAY deliberately has no payment case at all — the guard must fail closed.
});

afterAll(async () => {
  await prisma.blockchainRecord.deleteMany({ where: { caseId: { in: ALL_CASES } } });
  await prisma.paymentCase.deleteMany({ where: { caseId: { in: ALL_CASES } } });
  await prisma.acquisitionCase.deleteMany({ where: { caseId: { in: ALL_CASES } } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.blockchainRecord.deleteMany({ where: { caseId: { in: ALL_CASES } } });
});

describe("assertSettlementPaid — FR-005 / FR-019 M2 lock", () => {
  it("passes for a PAID case", async () => {
    await expect(assertSettlementPaid(CASE_PAID)).resolves.toBeUndefined();
  });

  it("rejects a case still at TRANSFER_SUCCEED, naming the current status", async () => {
    await expect(assertSettlementPaid(CASE_SUCCEED)).rejects.toThrow(/TRANSFER_SUCCEED/);
  });

  it("rejects a case with no payment case at all (fails closed)", async () => {
    await expect(assertSettlementPaid(CASE_NOPAY)).rejects.toThrow(/no payment case/);
  });
});

describe("publishRecord — SETTLEMENT requires PAID", () => {
  it("publishes the settlement for a PAID case", async () => {
    const record = await publishRecord({
      caseId: CASE_PAID,
      milestone: "SETTLEMENT",
      documentHash: "0xdoc",
      transactionHash: "0xsettled",
    });

    expect(record.milestone).toBe("SETTLEMENT");
    expect(record.status).toBe(BlockchainStatus.PUBLISHED);
    expect(record.transactionHash).toBe("0xsettled");
  });

  it("refuses to publish the settlement at TRANSFER_SUCCEED and writes no record", async () => {
    await expect(
      publishRecord({
        caseId: CASE_SUCCEED,
        milestone: "SETTLEMENT",
        documentHash: "0xdoc",
        transactionHash: "0xtoosoon",
      })
    ).rejects.toThrow(/must reach PAID/);

    expect(await prisma.blockchainRecord.findFirst({ where: { caseId: CASE_SUCCEED } })).toBeNull();
  });

  it("leaves the acquisition case open when the settlement publish is blocked", async () => {
    await expect(
      publishRecord({
        caseId: CASE_SUCCEED,
        milestone: "SETTLEMENT",
        documentHash: "0xdoc",
        transactionHash: "0xtoosoon",
      })
    ).rejects.toThrow();

    // The real damage of publishing M2 early: the case closes before the member
    // has confirmed receipt.
    const acq = await prisma.acquisitionCase.findUnique({ where: { caseId: CASE_SUCCEED } });
    expect(acq?.status).not.toBe(CaseStatus.CASE_CLOSED);
  });

  it("still accepts a repeated publish of the already-recorded settlement", async () => {
    const first = await publishRecord({
      caseId: CASE_PAID,
      milestone: "SETTLEMENT",
      documentHash: "0xdoc",
      transactionHash: "0xsettled",
    });

    const again = await publishRecord({
      caseId: CASE_PAID,
      milestone: "SETTLEMENT",
      documentHash: "0xdoc",
      transactionHash: "0xsettled",
    });

    expect(again.id).toBe(first.id);
    expect(await prisma.blockchainRecord.count({ where: { caseId: CASE_PAID, milestone: "SETTLEMENT" } })).toBe(1);
  });

  it("scopes the gate to SETTLEMENT — an AWARD publish is not blocked by a missing payment case", async () => {
    // CASE_NOPAY has no payment case. If the PAID guard leaked onto the AWARD
    // path, every award publish in the suite would start failing.
    const record = await publishRecord({
      caseId: CASE_NOPAY,
      milestone: "AWARD",
      documentHash: "0xdoc",
      transactionHash: "0xawardtx",
    });

    expect(record.milestone).toBe("AWARD");
  });
});
