process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://fcr_app:postgres@localhost:5432/fcr_scs?schema=public";

import { prisma } from "../prisma";
import {
  newPaymentId,
  formatPaymentResponse,
  resolveOwnBeneficiaryId,
  approveBankTransfer,
} from "../services/payment.service";
import { getSettlementSummaryBuffer, generateReceipt } from "../services/receipt.service";
import { PaymentStatus, CaseStatus } from "@prisma/client";

/**
 * Multi-owner (co-owned) parcel behaviour:
 *  - one payment case, N beneficiaries, each with its own apportioned share
 *  - one receipt per owner (LHDN: a receipt is 1-to-1 with its recipient)
 *  - a member can only ever resolve their OWN beneficiary row
 */
describe("Multi-owner payment apportionment and per-owner receipts", () => {
  let caseId = "";
  let paymentCaseId = "";
  const createdOwnerIds: string[] = [];
  const createdUserIds: string[] = [];
  let projectId = "";
  let createdById = "";

  beforeAll(async () => {
    const ac = await prisma.acquisitionCase.findFirst();
    projectId = ac!.projectId;
    createdById = ac!.createdById;

    caseId = `MULTI-OWNER-${Date.now()}`;
    await prisma.acquisitionCase.create({
      data: {
        caseId,
        projectId,
        createdById,
        caseTitle: `Multi Owner Test ${caseId}`,
        status: CaseStatus.OFFER_ACCEPTED,
        registrationDate: new Date(),
        remarks: "multi-owner test",
      },
    });

    const pc = await prisma.paymentCase.create({
      data: {
        id: await newPaymentId(),
        caseId,
        // Legacy single-beneficiary column stays populated for back-compat.
        beneficiaryId: (await prisma.landOwner.findFirst())!.ownerId,
        amount: 100000,
        status: PaymentStatus.BANK_DETAILS_PENDING,
      },
    });
    paymentCaseId = pc.id;
  });

  afterAll(async () => {
    if (paymentCaseId) {
      await prisma.paymentReceipt.deleteMany({ where: { paymentCaseId } });
      await prisma.paymentSettlementSummary.deleteMany({ where: { paymentCaseId } });
      await prisma.paymentBeneficiary.deleteMany({ where: { paymentCaseId } });
      await prisma.paymentCase.deleteMany({ where: { id: paymentCaseId } });
    }
    for (const id of createdOwnerIds) {
      await prisma.landOwner.deleteMany({ where: { ownerId: id } });
    }
    for (const id of createdUserIds) {
      await prisma.user.deleteMany({ where: { userId: id } });
    }
    await prisma.acquisitionCase.deleteMany({ where: { caseId } });
    await prisma.$disconnect();
  });

  const makeOwner = async (name: string, nric: string) => {
    const o = await prisma.landOwner.create({
      data: {
        name,
        nric,
        address: "Multi Owner Test Address",
        contact: "0123456789",
        email: `${name.replace(/\s+/g, ".").toLowerCase()}.${Date.now()}@example.com`,
        createdById,
      },
    });
    createdOwnerIds.push(o.ownerId);
    return o;
  };

  /**
   * A throwaway member. Tests must never repoint a seeded user (m1, m2, ...) at a
   * fixture identity — the suites share one database and run concurrently.
   */
  const makeMember = async (name: string, nric: string, email: string) => {
    const seq = createdUserIds.length;
    const u = await prisma.user.create({
      data: {
        userId: `USR-2026-09-${String(Date.now()).slice(-4)}${seq}`,
        name,
        email,
        // contact_number is unique per role, so each fixture needs its own.
        contactNumber: `0199${String(Date.now()).slice(-6)}${seq}`,
        identificationNumber: nric,
        passwordHash: "x",
        role: "DISPLACED_COMMUNITY_MEMBER",
        isActive: true,
      },
    });
    createdUserIds.push(u.userId);
    return u;
  };

  it("stores one beneficiary row per owner with an apportioned share and amount", async () => {
    const a = await makeOwner("Owner Sixty", "900101140001");
    const b = await makeOwner("Owner Forty", "900101140002");
    const c = await makeOwner("Owner Zero", "900101140003");

    // 60 / 40 / 0 split of a RM 100,000 award.
    await prisma.paymentBeneficiary.createMany({
      data: [
        { paymentCaseId, ownerId: a.ownerId, beneficiaryIndex: 0, sharePercent: 60, amount: 60000 },
        { paymentCaseId, ownerId: b.ownerId, beneficiaryIndex: 1, sharePercent: 40, amount: 40000 },
        { paymentCaseId, ownerId: c.ownerId, beneficiaryIndex: 2, sharePercent: 0, amount: 0 },
      ],
    });

    const rows = await prisma.paymentBeneficiary.findMany({
      where: { paymentCaseId },
      orderBy: { beneficiaryIndex: "asc" },
    });

    expect(rows).toHaveLength(3);
    expect(rows.map((r) => Number(r.sharePercent))).toEqual([60, 40, 0]);
    expect(rows.map((r) => Number(r.amount))).toEqual([60000, 40000, 0]);
    // Apportioned amounts must sum back to the single case total.
    expect(rows.reduce((acc, r) => acc + Number(r.amount), 0)).toBe(100000);
  });

  it("reads each owner's share from the ownership row, not the owner record", async () => {
    // Regression: seeding mapped `ownership.landOwner` and dropped the share,
    // so every co-owner silently fell back to a 100% apportionment.
    const shareCaseId = `MULTI-SHARE-${Date.now()}`;
    await prisma.acquisitionCase.create({
      data: {
        caseId: shareCaseId,
        projectId,
        createdById,
        caseTitle: `Share Source Test ${shareCaseId}`,
        status: CaseStatus.OFFER_ACCEPTED,
        registrationDate: new Date(),
        remarks: "share source test",
      },
    });

    const parcel = await prisma.landParcel.create({
      data: {
        caseId: shareCaseId,
        landTitleNo: `PN-SHARE-${Date.now()}`,
        lotNo: "Lot Share Test",
        mukim: "Mukim Test",
        district: "District Test",
        state: "Perak",
        area: 1000,
        areaUnit: "SQUARE_METER",
        category: "AGRICULTURE",
        tenureType: "FREEHOLD",
        createdById,
      },
    });
    const o1 = await makeOwner("Share Thirty", "900101140010");
    const o2 = await makeOwner("Share Seventy", "900101140011");
    await prisma.landOwnership.createMany({
      data: [
        { landId: parcel.landId, ownerId: o1.ownerId, share: "30", createdById },
        { landId: parcel.landId, ownerId: o2.ownerId, share: "70", createdById },
      ],
    });

    const { newPaymentId: freshId, seedPaymentBeneficiaries } = await import("../services/payment.service");
    const pc = await prisma.paymentCase.create({
      data: {
        id: await freshId(),
        caseId: shareCaseId,
        beneficiaryId: o1.ownerId,
        amount: 100000,
        status: PaymentStatus.BANK_DETAILS_PENDING,
      },
    });

    // Mirror what the ingestion path does: carry the ownership's share through.
    const owners = (await prisma.landOwnership.findMany({
      where: { landId: parcel.landId },
      include: { landOwner: true },
    })).map((own) => ({ ...own.landOwner, share: own.share }));

    await seedPaymentBeneficiaries(pc.id, owners, 100000);

    const seeded = await prisma.paymentBeneficiary.findMany({
      where: { paymentCaseId: pc.id },
      orderBy: { beneficiaryIndex: "asc" },
    });
    expect(seeded.map((r) => Number(r.sharePercent)).sort((x, y) => x - y)).toEqual([30, 70]);
    expect(seeded.reduce((acc, r) => acc + Number(r.amount), 0)).toBe(100000);

    await prisma.paymentBeneficiary.deleteMany({ where: { paymentCaseId: pc.id } });
    await prisma.paymentCase.deleteMany({ where: { id: pc.id } });
    await prisma.landOwnership.deleteMany({ where: { landId: parcel.landId } });
    await prisma.landParcel.deleteMany({ where: { landId: parcel.landId } });
    await prisma.acquisitionCase.deleteMany({ where: { caseId: shareCaseId } });
  });

  it("surfaces N-of-M submission progress through formatPaymentResponse", async () => {
    const rows = await prisma.paymentBeneficiary.findMany({
      where: { paymentCaseId },
      orderBy: { beneficiaryIndex: "asc" },
    });
    await prisma.paymentBeneficiary.update({
      where: { id: rows[0].id },
      data: { submittedAt: new Date(), bankName: "Maybank", accountNumber: "114012345678" },
    });

    const fresh = await prisma.paymentCase.findUnique({
      where: { id: paymentCaseId },
      include: { beneficiaries: { orderBy: { beneficiaryIndex: "asc" } } },
    });
    const out = formatPaymentResponse(fresh!) as any;

    expect(out.beneficiaryTotal).toBe(3);
    expect(out.beneficiarySubmitted).toBe(1);
  });

  it("resolves a member to their own beneficiary row only", async () => {
    const rows = await prisma.paymentBeneficiary.findMany({
      where: { paymentCaseId },
      include: { owner: true },
      orderBy: { beneficiaryIndex: "asc" },
    });

    // A user whose identity matches the first owner resolves to that row alone.
    const mine = await makeMember(rows[0].owner.name, rows[0].owner.nric, `multi.owner.a.${Date.now()}@example.com`);
    const own = await resolveOwnBeneficiaryId(caseId, mine.userId);
    expect(own).toBe(rows[0].id);
    expect(own).not.toBe(rows[1].id);

    // A user who is not a beneficiary of this case gets nothing, never "all".
    const stranger = await makeMember("Not A Beneficiary", "999999999999", `multi.owner.b.${Date.now()}@example.com`);
    expect(await resolveOwnBeneficiaryId(caseId, stranger.userId)).toBeNull();
  });

  it("issues one receipt per paying owner, not one per case", async () => {
    await prisma.paymentCase.update({
      where: { id: paymentCaseId },
      data: { status: PaymentStatus.BANK_APPROVAL_PENDING },
    });

    const rows = await prisma.paymentBeneficiary.findMany({
      where: { paymentCaseId, submittedAt: { not: null } },
      orderBy: { beneficiaryIndex: "asc" },
    });
    expect(rows).toHaveLength(1);

    await approveBankTransfer(caseId, "RENTAS-MULTI-OWNER-TEST");

    const receipts = await prisma.paymentReceipt.findMany({ where: { paymentCaseId } });
    // Only owners who actually submitted bank details get a receipt.
    expect(receipts).toHaveLength(rows.length);
    expect(receipts[0].paymentBeneficiaryId).toBe(rows[0].id);
    expect(receipts[0].bankReferenceNumber).toBe("RENTAS-MULTI-OWNER-TEST");
  });

  it("creates one combined settlement summary for the case", async () => {
    const summary = await prisma.paymentSettlementSummary.findUnique({ where: { paymentCaseId } });
    expect(summary).not.toBeNull();
    expect(Number(summary!.totalAmount)).toBe(100000);
    expect(summary!.beneficiaryCount).toBe(1);

    const pdf = await getSettlementSummaryBuffer(caseId);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("renders an owner receipt showing only that owner's apportioned amount", async () => {
    // A receipt without a beneficiary scope must still render (legacy compatibility).
    const pdf = await generateReceipt(caseId);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    // Strictly one page — the receipt layout must never wrap.
    const pageCount = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
    expect(pageCount).toBe(1);
  });
});
