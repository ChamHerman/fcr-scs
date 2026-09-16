process.env.ADMIN_WALLET_ADDRESS = "0xAdminWallet123";
process.env.DATABASE_URL = "postgresql://fcr_app:postgres@localhost:5432/fcr_scs?schema=public";
process.env.NODE_ENV = "test";

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import { BlockchainStatus, CaseStatus, UserRole } from "@prisma/client";
import { prisma } from "./testAuthHelper";

// publishRecord verifies the mined receipt on-chain before writing. The tests
// here are about the claim and the atomic write, not Sepolia.
jest.mock("../services/ethereum.service", () => ({
  getActiveContractAddress: jest.fn(() => "0xContractAddr"),
  verifyTransactionReceipt: jest.fn(async () => ({
    found: true,
    success: true,
    to: "0xcontractaddr",
  })),
}));

import {
  claimPublish,
  releasePublishClaim,
  getPublishClaims,
  assertNotClaimedByOther,
  publishRecord,
  PublishClaimHeldByError,
} from "../services/blockchain.service";
import { PUBLISH_CLAIM_TTL_MS, isClaimLive, formatClaimElapsed } from "../utils/publish-claim";

const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
const CASE_A = `CLAIM-TEST-A-${stamp}`;
const CASE_B = `CLAIM-TEST-B-${stamp}`;

let ga1Id = "";
let ga1Name = "";
let ga2Id = "";
let ga2Name = "";

beforeAll(async () => {
  const [ga1, ga2] = await Promise.all([
    prisma.user.findUnique({ where: { email: "ga1@fcrscs.gov.my" }, select: { userId: true, name: true } }),
    prisma.user.findUnique({ where: { email: "ga2@fcrscs.gov.my" }, select: { userId: true, name: true } }),
  ]);
  if (!ga1 || !ga2) throw new Error("Seeded GA users are required for the claim tests");
  ga1Id = ga1.userId;
  ga1Name = ga1.name;
  ga2Id = ga2.userId;
  ga2Name = ga2.name;

  const template = await prisma.acquisitionCase.findFirst();
  if (!template) throw new Error("An existing acquisition case is required as a FK parent");
  for (const caseId of [CASE_A, CASE_B]) {
    await prisma.acquisitionCase.create({
      data: {
        caseId,
        projectId: template.projectId,
        createdById: template.createdById,
        caseTitle: `Publish Claim Test ${caseId}`,
        status: CaseStatus.OFFER_ACCEPTED,
        registrationDate: new Date(),
        remarks: "publish-claims test",
      },
    });
  }
});

afterAll(async () => {
  await prisma.publishClaim.deleteMany({ where: { caseId: { in: [CASE_A, CASE_B] } } });
  await prisma.blockchainRecord.deleteMany({ where: { caseId: { in: [CASE_A, CASE_B] } } });
  await prisma.acquisitionCase.deleteMany({ where: { caseId: { in: [CASE_A, CASE_B] } } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.publishClaim.deleteMany({ where: { caseId: { in: [CASE_A, CASE_B] } } });
});

describe("claimPublish — one admin at a time per (caseId, milestone)", () => {
  it("lets the first claimant take the lock", async () => {
    const claim = await claimPublish({ caseId: CASE_A, milestone: "AWARD", adminId: ga1Id, adminName: ga1Name });
    expect(claim.adminId).toBe(ga1Id);
    expect(await getPublishClaims()).toHaveLength(1);
  });

  it("rejects a second admin and names the holder", async () => {
    await claimPublish({ caseId: CASE_A, milestone: "AWARD", adminId: ga1Id, adminName: ga1Name });
    await expect(
      claimPublish({ caseId: CASE_A, milestone: "AWARD", adminId: ga2Id, adminName: ga2Name })
    ).rejects.toBeInstanceOf(PublishClaimHeldByError);

    try {
      await claimPublish({ caseId: CASE_A, milestone: "AWARD", adminId: ga2Id, adminName: ga2Name });
    } catch (e) {
      expect((e as PublishClaimHeldByError).holderAdminId).toBe(ga1Id);
      expect((e as Error).message).toContain(ga1Name);
    }
  });

  it("keeps M1 and M2 of the same case independent", async () => {
    await claimPublish({ caseId: CASE_A, milestone: "AWARD", adminId: ga1Id, adminName: ga1Name });
    const m2 = await claimPublish({ caseId: CASE_A, milestone: "SETTLEMENT", adminId: ga2Id, adminName: ga2Name });
    expect(m2.milestone).toBe("SETTLEMENT");
  });

  it("normalises the M1/M2 aliases onto the stored milestone so both spellings collide", async () => {
    await claimPublish({ caseId: CASE_B, milestone: "M1", adminId: ga1Id, adminName: ga1Name });
    await expect(
      claimPublish({ caseId: CASE_B, milestone: "AWARD", adminId: ga2Id, adminName: ga2Name })
    ).rejects.toBeInstanceOf(PublishClaimHeldByError);
  });

  it("lets the same admin re-claim after a reload instead of self-deadlocking", async () => {
    await claimPublish({ caseId: CASE_A, milestone: "AWARD", adminId: ga1Id, adminName: ga1Name });
    const again = await claimPublish({ caseId: CASE_A, milestone: "AWARD", adminId: ga1Id, adminName: ga1Name });
    expect(again.adminId).toBe(ga1Id);
  });

  it("frees a claim once it is older than the TTL", async () => {
    await claimPublish({ caseId: CASE_A, milestone: "AWARD", adminId: ga1Id, adminName: ga1Name });
    await prisma.publishClaim.update({
      where: { caseId_milestone: { caseId: CASE_A, milestone: "AWARD" } },
      data: { claimedAt: new Date(Date.now() - PUBLISH_CLAIM_TTL_MS - 1000) },
    });
    expect(await getPublishClaims()).toHaveLength(0);
    const stolen = await claimPublish({ caseId: CASE_A, milestone: "AWARD", adminId: ga2Id, adminName: ga2Name });
    expect(stolen.adminId).toBe(ga2Id);
  });
});

describe("releasePublishClaim", () => {
  it("frees the lock for the holder", async () => {
    await claimPublish({ caseId: CASE_A, milestone: "AWARD", adminId: ga1Id, adminName: ga1Name });
    expect(await releasePublishClaim({ caseId: CASE_A, milestone: "AWARD", adminId: ga1Id })).toBe(1);
    expect(await getPublishClaims()).toHaveLength(0);
  });

  it("cannot be used by another admin to unlock a record mid-publish", async () => {
    await claimPublish({ caseId: CASE_A, milestone: "AWARD", adminId: ga1Id, adminName: ga1Name });
    expect(await releasePublishClaim({ caseId: CASE_A, milestone: "AWARD", adminId: ga2Id })).toBe(0);
    await expect(
      claimPublish({ caseId: CASE_A, milestone: "AWARD", adminId: ga2Id, adminName: ga2Name })
    ).rejects.toBeInstanceOf(PublishClaimHeldByError);
  });

  it("is idempotent", async () => {
    expect(await releasePublishClaim({ caseId: CASE_A, milestone: "AWARD", adminId: ga1Id })).toBe(0);
  });
});

describe("assertNotClaimedByOther", () => {
  it("is a no-op when free or held by the caller, and throws for another holder", async () => {
    await expect(assertNotClaimedByOther(CASE_A, "AWARD", ga1Id)).resolves.toBeUndefined();
    await claimPublish({ caseId: CASE_A, milestone: "AWARD", adminId: ga1Id, adminName: ga1Name });
    await expect(assertNotClaimedByOther(CASE_A, "AWARD", ga1Id)).resolves.toBeUndefined();
    await expect(assertNotClaimedByOther(CASE_A, "AWARD", ga2Id)).rejects.toBeInstanceOf(PublishClaimHeldByError);
  });
});

describe("publishRecord — first write wins", () => {
  it("rejects a second publish with a different tx and keeps the winner's hash", async () => {
    const record = await prisma.blockchainRecord.create({
      data: {
        id: `BCN-TEST-${stamp}`,
        caseId: CASE_A,
        milestone: "AWARD",
        documentHash: "0xdoc",
        status: BlockchainStatus.READY_TO_PUBLISH,
      },
    });

    await publishRecord({
      caseId: CASE_A,
      milestone: "AWARD",
      documentHash: "0xdoc",
      transactionHash: "0xwinner",
    });

    await expect(
      publishRecord({ caseId: CASE_A, milestone: "AWARD", documentHash: "0xdoc", transactionHash: "0xloser" })
    ).rejects.toThrow(/already published/i);

    const persisted = await prisma.blockchainRecord.findUnique({ where: { id: record.id } });
    expect(persisted?.transactionHash).toBe("0xwinner");
  });

  it("releases the publisher's own claim on success", async () => {
    await prisma.blockchainRecord.create({
      data: {
        id: `BCN-TEST-B-${stamp}`,
        caseId: CASE_B,
        milestone: "AWARD",
        documentHash: "0xdoc",
        status: BlockchainStatus.READY_TO_PUBLISH,
      },
    });
    await claimPublish({ caseId: CASE_B, milestone: "AWARD", adminId: ga1Id, adminName: ga1Name });
    await publishRecord({
      caseId: CASE_B,
      milestone: "AWARD",
      documentHash: "0xdoc",
      transactionHash: "0xga1tx",
      adminId: ga1Id,
    });
    expect(await getPublishClaims()).toHaveLength(0);
  });
});

describe("publish-claim helpers", () => {
  it("treats a claim as live strictly inside the TTL", () => {
    const now = Date.now();
    expect(isClaimLive(new Date(now - 1000), now)).toBe(true);
    expect(isClaimLive(new Date(now - PUBLISH_CLAIM_TTL_MS + 1000), now)).toBe(true);
    expect(isClaimLive(new Date(now - PUBLISH_CLAIM_TTL_MS - 1000), now)).toBe(false);
    expect(isClaimLive(null, now)).toBe(false);
  });

  it("covers the MetaMask receipt timeout plus a latency buffer", () => {
    expect(PUBLISH_CLAIM_TTL_MS).toBeGreaterThan(120_000);
  });

  it("formats elapsed time as m:ss", () => {
    expect(formatClaimElapsed(0)).toBe("0:00");
    expect(formatClaimElapsed(42_000)).toBe("0:42");
    expect(formatClaimElapsed(75_000)).toBe("1:15");
  });
});
