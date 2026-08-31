import { prisma } from "../prisma";
import { CaseStatus, OfferStatus, ObjectionStatus, Prisma } from "@prisma/client";


export interface OfferLetterFilters {
  status?: string;
  search?: string;
  ownerNric?: string;
  caseCreatedById?: string;
  userRole?: string;
  userId?: string;
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
  createdById?: string;
}

export async function getAllOfferLetters(filters: OfferLetterFilters) {
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const andConditions: Prisma.OfferLetterWhereInput[] = [];

  if (filters.status) {
    andConditions.push({ status: filters.status as OfferStatus });
  }

  // 1. Government Officer: directly filter by user ID (createdById on OfferLetter or AcquisitionCase)
  if (filters.caseCreatedById || (filters.userRole === "GOVERNMENT_OFFICER" && filters.userId) || (filters.userId && !filters.ownerNric)) {
    const targetUserId = filters.caseCreatedById || filters.userId;
    if (targetUserId) {
      andConditions.push({
        OR: [
          { createdById: targetUserId },
          { acquisitionCase: { createdById: targetUserId } },
        ],
      });
    }
  }

  if (filters.ownerNric) {
    const rawNric = filters.ownerNric.trim();
    const cleanNric = rawNric.replace(/[^a-zA-Z0-9]/g, "");
    let formattedWithDashes = rawNric;
    if (cleanNric.length === 12) {
      formattedWithDashes = `${cleanNric.slice(0, 6)}-${cleanNric.slice(6, 8)}-${cleanNric.slice(8)}`;
    }

    const nricConditions: Prisma.LandOwnerWhereInput[] = [
      { nric: { contains: rawNric, mode: "insensitive" } },
    ];
    if (cleanNric && cleanNric !== rawNric) {
      nricConditions.push({ nric: { contains: cleanNric, mode: "insensitive" } });
    }
    if (formattedWithDashes && formattedWithDashes !== rawNric && formattedWithDashes !== cleanNric) {
      nricConditions.push({ nric: { contains: formattedWithDashes, mode: "insensitive" } });
    }

    // Match if user is direct ownership on offer letter OR a co-owner of the land parcel
    andConditions.push({
      OR: [
        {
          landOwnership: {
            landOwner: {
              OR: nricConditions,
            },
          },
        },
        {
          acquisitionCase: {
            landParcel: {
              ownerships: {
                some: {
                  landOwner: {
                    OR: nricConditions,
                  },
                },
              },
            },
          },
        },
      ],
    });
  }

  if (filters.search) {
    const term = filters.search;
    andConditions.push({
      OR: [
        { offerReferenceNo: { contains: term, mode: "insensitive" } },
        { acquisitionCase: { caseTitle: { contains: term, mode: "insensitive" } } },
        { landOwnership: { landOwner: { name: { contains: term, mode: "insensitive" } } } },
        {
          acquisitionCase: {
            landParcel: {
              ownerships: {
                some: {
                  landOwner: {
                    name: { contains: term, mode: "insensitive" },
                  },
                },
              },
            },
          },
        },
      ],
    });
  }

  const where: Prisma.OfferLetterWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

  const [offerLetters, total] = await Promise.all([
    prisma.offerLetter.findMany({
      where,
      include: {
        acquisitionCase: {
          include: {
            project: true,
            landParcel: {
              include: {
                ownerships: {
                  include: {
                    landOwner: true,
                  },
                },
              },
            },
          },
        },
        compensationReport: {
          include: {
            valuationReport: {
              include: { valuer: true },
            },
          },
        },
        landOwnership: { include: { landOwner: true, landParcel: true } },
        memberResponses: { include: { landOwner: true } },
        objections: true,
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
      acquisitionCase: {
        include: {
          project: true,
          landParcel: {
            include: {
              ownerships: {
                include: {
                  landOwner: true,
                },
              },
            },
          },
          valuationReports: true,
        },
      },
      compensationReport: {
        include: {
          valuationReport: {
            include: { valuer: true },
          },
        },
      },
      landOwnership: { include: { landOwner: true, landParcel: true } },
      objections: true,
      memberResponses: {
        include: {
          landOwner: true,
        },
      },
    },
  });

  if (!offer) {
    throw new Error("Offer letter not found");
  }

  return offer;
}

export async function createOfferLetter(input: CreateOfferLetterInput) {
  const { compensationReportId, caseId, ownershipId, offerType, offerAmount, acceptancePeriodDays = 42, remarks, createdById } = input;

  const compReport = await prisma.compensationReport.findUnique({
    where: { compensationReportId },
  });
  if (!compReport) throw new Error("Compensation report not found");
  if (compReport.status !== "APPROVED") {
    throw new Error("Compensation report must be APPROVED before issuing offer letter");
  }

  // The offer letter created by should be the same as the compensation report created by
  const finalCreatedById = compReport.createdById || createdById || "00000000-0000-0000-0000-000000000001";

  const refNo = `OFFER-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
  const SIX_WEEKS_MS = 42 * 24 * 60 * 60 * 1000;
  const offerDate = new Date(Date.now() + SIX_WEEKS_MS);
  const finalAcceptanceDays = acceptancePeriodDays || 42;
  const expiryDate = new Date(offerDate.getTime() + finalAcceptanceDays * 24 * 60 * 60 * 1000);

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
        acceptancePeriodDays: finalAcceptanceDays,
        status: OfferStatus.PENDING,
        remarks: remarks || "",
        createdById: finalCreatedById,
      },
      include: {
        acquisitionCase: true,
        compensationReport: true,
        landOwnership: { include: { landOwner: true } },
        memberResponses: { include: { landOwner: true } },
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

export interface RespondOfferOptions {
  signedDocument?: string;
  forceAccept?: boolean;
  ownerNric?: string;
  ownerId?: string;
  userId?: string;
  remarks?: string;
}

function findMatchingOwner(owners: any[], options?: RespondOfferOptions) {
  if (!options) return owners[0] || null;

  if (options.ownerId) {
    const found = owners.find((o) => o.ownerId === options.ownerId);
    if (found) return found;
  }

  if (options.ownerNric) {
    const rawNric = options.ownerNric.trim();
    const cleanNric = rawNric.replace(/[^a-zA-Z0-9]/g, "");
    const found = owners.find((o) => {
      const oNric = (o.nric || "").trim();
      const oClean = oNric.replace(/[^a-zA-Z0-9]/g, "");
      return oNric === rawNric || (cleanNric && oClean === cleanNric);
    });
    if (found) return found;
  }

  return owners[0] || null;
}

export async function acceptOffer(
  offerId: string,
  signedDocument?: string,
  forceAccept: boolean = false,
  options?: RespondOfferOptions
) {
  const offer = await prisma.offerLetter.findUnique({
    where: { offerId },
    include: {
      objections: true,
      acquisitionCase: {
        include: {
          landParcel: {
            include: {
              ownerships: {
                include: { landOwner: true },
              },
            },
          },
        },
      },
      landOwnership: { include: { landOwner: true } },
      memberResponses: { include: { landOwner: true } },
    },
  });
  if (!offer) throw new Error("Offer letter not found");

  if (offer.status !== OfferStatus.PENDING) {
    throw new Error(`Cannot accept offer in '${offer.status}' status`);
  }

  // Check for active (unresolved) objections related to this offer/case
  const activeObjections = (offer.objections || []).filter(
    (o) => o.status === ObjectionStatus.PENDING
  );

  if (activeObjections.length > 0 && !forceAccept) {
    const err: any = new Error("Active objection exists for this case/offer letter.");
    err.code = "ACTIVE_OBJECTION_EXISTS";
    err.objection = activeObjections[0];
    throw err;
  }

  // Extract all parcel owners
  const parcelOwnerships = offer.acquisitionCase?.landParcel?.ownerships || [];
  const parcelOwners = parcelOwnerships.map((ow) => ow.landOwner).filter(Boolean);
  const allOwners = parcelOwners.length > 0
    ? parcelOwners
    : (offer.landOwnership?.landOwner ? [offer.landOwnership.landOwner] : []);

  const totalOwnersCount = Math.max(allOwners.length, 1);
  const matchingOwner = findMatchingOwner(allOwners, options);

  const result = await prisma.$transaction(async (tx) => {
    if (matchingOwner) {
      await tx.offerMemberResponse.upsert({
        where: {
          offerId_ownerId: {
            offerId,
            ownerId: matchingOwner.ownerId,
          },
        },
        create: {
          offerId,
          ownerId: matchingOwner.ownerId,
          status: OfferStatus.ACCEPTED,
          signedDocument: signedDocument || offer.signedDocument,
          respondedAt: new Date(),
        },
        update: {
          status: OfferStatus.ACCEPTED,
          signedDocument: signedDocument || offer.signedDocument,
          respondedAt: new Date(),
          remarks: null,
        },
      });
    }

    // Check all current responses
    const allResponses = await tx.offerMemberResponse.findMany({
      where: { offerId },
    });

    const acceptedOwners = allOwners.filter((owner) =>
      allResponses.some((r) => r.ownerId === owner.ownerId && r.status === OfferStatus.ACCEPTED)
    );

    const isAllAccepted = totalOwnersCount <= 1 || acceptedOwners.length >= totalOwnersCount;

    let updatedOffer;
    if (isAllAccepted) {
      // All owners have accepted! Update offer to ACCEPTED and case to OFFER_ACCEPTED
      updatedOffer = await tx.offerLetter.update({
        where: { offerId },
        data: {
          status: OfferStatus.ACCEPTED,
          acceptedAt: new Date(),
          signedDocument: signedDocument || offer.signedDocument,
        },
        include: {
          acquisitionCase: true,
          memberResponses: { include: { landOwner: true } },
        },
      });

      await tx.acquisitionCase.update({
        where: { caseId: offer.caseId },
        data: { status: CaseStatus.OFFER_ACCEPTED },
      });
    } else {
      // Partially accepted (multi-owner pending)
      updatedOffer = await tx.offerLetter.findUnique({
        where: { offerId },
        include: {
          acquisitionCase: true,
          memberResponses: { include: { landOwner: true } },
        },
      });
    }

    return updatedOffer;
  });

  return result;
}

export async function rejectOffer(
  offerId: string,
  remarks?: string,
  options?: RespondOfferOptions
) {
  const offer = await prisma.offerLetter.findUnique({
    where: { offerId },
    include: {
      acquisitionCase: {
        include: {
          landParcel: {
            include: {
              ownerships: {
                include: { landOwner: true },
              },
            },
          },
        },
      },
      landOwnership: { include: { landOwner: true } },
      memberResponses: { include: { landOwner: true } },
    },
  });
  if (!offer) throw new Error("Offer letter not found");

  if (offer.status !== OfferStatus.PENDING) {
    throw new Error(`Cannot reject offer in '${offer.status}' status`);
  }

  // Extract all parcel owners
  const parcelOwnerships = offer.acquisitionCase?.landParcel?.ownerships || [];
  const parcelOwners = parcelOwnerships.map((ow) => ow.landOwner).filter(Boolean);
  const allOwners = parcelOwners.length > 0
    ? parcelOwners
    : (offer.landOwnership?.landOwner ? [offer.landOwnership.landOwner] : []);

  const matchingOwner = findMatchingOwner(allOwners, options);

  const result = await prisma.$transaction(async (tx) => {
    if (matchingOwner) {
      await tx.offerMemberResponse.upsert({
        where: {
          offerId_ownerId: {
            offerId,
            ownerId: matchingOwner.ownerId,
          },
        },
        create: {
          offerId,
          ownerId: matchingOwner.ownerId,
          status: OfferStatus.REJECTED,
          remarks: remarks || "Offer rejected",
          respondedAt: new Date(),
        },
        update: {
          status: OfferStatus.REJECTED,
          remarks: remarks || "Offer rejected",
          respondedAt: new Date(),
        },
      });
    }

    // Build clear rejection remark noting who rejected
    let finalRemark = remarks || "";
    if (matchingOwner) {
      const ownerInfo = `${matchingOwner.name} (${matchingOwner.nric})`;
      finalRemark = remarks ? `Rejected by ${ownerInfo}: ${remarks}` : `Rejected by ${ownerInfo}`;
    }

    const updatedOffer = await tx.offerLetter.update({
      where: { offerId },
      data: {
        status: OfferStatus.REJECTED,
        rejectedAt: new Date(),
        remarks: finalRemark || offer.remarks,
      },
      include: {
        acquisitionCase: true,
        memberResponses: { include: { landOwner: true } },
      },
    });

    await tx.acquisitionCase.update({
      where: { caseId: offer.caseId },
      data: { status: CaseStatus.OFFER_REJECTED },
    });

    return updatedOffer;
  });

  return result;
}

export async function cancelAcceptance(
  offerId: string,
  options?: RespondOfferOptions
) {
  const offer = await prisma.offerLetter.findUnique({
    where: { offerId },
    include: {
      acquisitionCase: {
        include: {
          landParcel: {
            include: {
              ownerships: {
                include: { landOwner: true },
              },
            },
          },
        },
      },
      landOwnership: { include: { landOwner: true } },
      memberResponses: { include: { landOwner: true } },
    },
  });
  if (!offer) throw new Error("Offer letter not found");

  // Extract all parcel owners
  const parcelOwnerships = offer.acquisitionCase?.landParcel?.ownerships || [];
  const parcelOwners = parcelOwnerships.map((ow) => ow.landOwner).filter(Boolean);
  const allOwners = parcelOwners.length > 0
    ? parcelOwners
    : (offer.landOwnership?.landOwner ? [offer.landOwnership.landOwner] : []);

  const matchingOwner = findMatchingOwner(allOwners, options);

  // Check 1-day (24 hour) cancellation window
  const memberResp = matchingOwner
    ? offer.memberResponses.find((r) => r.ownerId === matchingOwner.ownerId)
    : null;

  const acceptanceTime = memberResp?.respondedAt || offer.acceptedAt;
  if (!acceptanceTime) {
    throw new Error("No formal acceptance record found to cancel");
  }

  const now = new Date();
  const diffHours = (now.getTime() - new Date(acceptanceTime).getTime()) / (1000 * 60 * 60);

  if (diffHours > 24) {
    throw new Error(
      "The 1-day cancellation period has expired. Approvals cannot be cancelled or modified after 24 hours."
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    if (matchingOwner) {
      await tx.offerMemberResponse.upsert({
        where: {
          offerId_ownerId: {
            offerId,
            ownerId: matchingOwner.ownerId,
          },
        },
        create: {
          offerId,
          ownerId: matchingOwner.ownerId,
          status: OfferStatus.PENDING,
          remarks: "Approval cancelled within 1-day grace period",
          respondedAt: new Date(),
        },
        update: {
          status: OfferStatus.PENDING,
          remarks: "Approval cancelled within 1-day grace period",
          respondedAt: new Date(),
        },
      });
    }

    const updatedOffer = await tx.offerLetter.update({
      where: { offerId },
      data: {
        status: OfferStatus.PENDING,
        acceptedAt: null,
        remarks: "Approval cancelled by land owner within 24-hour grace window",
      },
      include: {
        acquisitionCase: true,
        memberResponses: { include: { landOwner: true } },
      },
    });

    if (offer.caseId) {
      await tx.acquisitionCase.update({
        where: { caseId: offer.caseId },
        data: { status: CaseStatus.OFFER_ISSUED },
      });
    }

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

