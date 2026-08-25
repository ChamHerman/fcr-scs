import { prisma } from "../prisma";
import { CaseStatus, OfferStatus, ObjectionStatus, Prisma } from "@prisma/client";


export interface OfferLetterFilters {
  status?: string;
  search?: string;
  ownerNric?: string;
  page?: number;
  limit?: number;
}

export interface CreateOfferLetterInput {
  compensationReportId: string;
  caseId: string;
  ownershipId: string;
  offerType: string;
  offerAmount: number;
  acceptancePeriodDays?: number;
  remarks?: string;
  createdById: string;
}

export async function getAllOfferLetters(filters: OfferLetterFilters) {
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const where: Prisma.OfferLetterWhereInput = {};

  if (filters.status) {
    where.status = filters.status as OfferStatus;
  }

  if (filters.ownerNric) {
    where.landOwnership = {
      landOwner: {
        nric: {
          contains: filters.ownerNric,
          mode: "insensitive",
        },
      },
    };
  }

  if (filters.search) {
    const term = filters.search;
    where.OR = [
      { offerReferenceNo: { contains: term, mode: "insensitive" } },
      { acquisitionCase: { caseTitle: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [offerLetters, total] = await Promise.all([
    prisma.offerLetter.findMany({
      where,
      include: {
        acquisitionCase: { include: { project: true } },
        compensationReport: true,
        landOwnership: { include: { landOwner: true, landParcel: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.offerLetter.count({ where }),
  ]);

  return { offerLetters, total, page, limit };
}

export async function getOfferLetterById(offerId: string) {
  const offer = await prisma.offerLetter.findUnique({
    where: { offerId },
    include: {
      acquisitionCase: { include: { project: true, landParcel: true } },
      compensationReport: true,
      landOwnership: { include: { landOwner: true, landParcel: true } },
      objections: true,
    },
  });

  if (!offer) {
    throw new Error("Offer letter not found");
  }

  return offer;
}

export async function createOfferLetter(input: CreateOfferLetterInput) {
  const { compensationReportId, caseId, ownershipId, offerType, offerAmount, acceptancePeriodDays = 14, remarks, createdById } = input;

  const compReport = await prisma.compensationReport.findUnique({
    where: { compensationReportId },
  });
  if (!compReport) throw new Error("Compensation report not found");
  if (compReport.status !== "APPROVED") {
    throw new Error("Compensation report must be APPROVED before issuing offer letter");
  }

  const refNo = `OFFER-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
  const offerDate = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + acceptancePeriodDays);

  const result = await prisma.$transaction(async (tx) => {
    const offer = await tx.offerLetter.create({
      data: {
        compensationReportId,
        caseId,
        ownershipId,
        offerReferenceNo: refNo,
        offerType: offerType || "Form H (Standard Offer)",
        offerAmount,
        offerDate,
        expiryDate,
        acceptancePeriodDays,
        status: OfferStatus.PENDING,
        remarks: remarks || "",
        createdById,
      },
      include: {
        acquisitionCase: true,
        compensationReport: true,
        landOwnership: { include: { landOwner: true } },
      },
    });

    await tx.acquisitionCase.update({
      where: { caseId },
      data: { status: CaseStatus.OFFER_ISSUED },
    });

    return offer;
  });

  return result;
}

export async function acceptOffer(offerId: string, signedDocument?: string, forceAccept: boolean = false) {

  const offer = await prisma.offerLetter.findUnique({
    where: { offerId },
    include: { objections: true },
  });
  if (!offer) throw new Error("Offer letter not found");

  if (offer.status !== OfferStatus.PENDING) {
    throw new Error(`Cannot accept offer in '${offer.status}' status`);
  }

  // Check for active (unresolved) objections related to this offer/case
  const activeObjections = (offer.objections || []).filter(
    (o) => o.status === ObjectionStatus.SUBMITTED || o.status === ObjectionStatus.UNDER_REVIEW
  );

  if (activeObjections.length > 0 && !forceAccept) {
    const err: any = new Error("Active objection exists for this case/offer letter.");
    err.code = "ACTIVE_OBJECTION_EXISTS";
    err.objection = activeObjections[0];
    throw err;
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedOffer = await tx.offerLetter.update({
      where: { offerId },
      data: {
        status: OfferStatus.ACCEPTED,
        acceptedAt: new Date(),
        signedDocument: signedDocument || offer.signedDocument,
      },
      include: { acquisitionCase: true },
    });

    await tx.acquisitionCase.update({
      where: { caseId: offer.caseId },
      data: { status: CaseStatus.OFFER_ACCEPTED },
    });

    return updatedOffer;
  });

  return result;
}


export async function rejectOffer(offerId: string, remarks?: string) {
  const offer = await prisma.offerLetter.findUnique({ where: { offerId } });
  if (!offer) throw new Error("Offer letter not found");

  if (offer.status !== OfferStatus.PENDING) {
    throw new Error(`Cannot reject offer in '${offer.status}' status`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedOffer = await tx.offerLetter.update({
      where: { offerId },
      data: {
        status: OfferStatus.REJECTED,
        rejectedAt: new Date(),
        remarks: remarks || offer.remarks,
      },
      include: { acquisitionCase: true },
    });

    await tx.acquisitionCase.update({
      where: { caseId: offer.caseId },
      data: { status: CaseStatus.OFFER_REJECTED },
    });

    return updatedOffer;
  });

  return result;
}

export async function checkAndMarkExpiredOffers(): Promise<number> {
  const now = new Date();
  const expiredOffers = await prisma.offerLetter.findMany({
    where: {
      status: OfferStatus.PENDING,
      expiryDate: { lt: now },
    },
  });

  if (expiredOffers.length === 0) return 0;

  await prisma.$transaction(
    expiredOffers.map((offer) =>
      prisma.offerLetter.update({
        where: { offerId: offer.offerId },
        data: { status: OfferStatus.EXPIRED },
      })
    )
  );

  return expiredOffers.length;
}

