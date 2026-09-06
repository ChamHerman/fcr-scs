import { prisma } from "../prisma";
import { ObjectionStatus, Decision, OfferStatus, CaseStatus, Prisma } from "@prisma/client";
import { buildNricConditions } from "../utils/nric.utils";

export interface ObjectionFilters {
  status?: string;
  search?: string;
  ownerNric?: string;
  caseCreatedById?: string;
  userRole?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface CreateObjectionInput {
  offerId: string;
  caseId: string;
  objectionReason: string;
  requestedAmount: number;
  createdById: string;
}

export interface ReviewObjectionInput {
  objectionId: string;
  decision: "ACCEPTED" | "REJECTED" | "REVISED";
  revisedCompensation?: number;
  reviewRemarks: string;
  reviewedById: string;
}

export interface ApproveObjectionInput {
  objectionId: string;
  revisedCompensation?: number;
  reviewRemarks?: string;
  reviewedById?: string;
}

export async function getAllObjections(filters: ObjectionFilters) {
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const andConditions: Prisma.ObjectionWhereInput[] = [];

  if (filters.status) {
    andConditions.push({ status: filters.status as ObjectionStatus });
  }

  // 1. Government Officer Supervision: only objections under cases created/supervised by this officer
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

  // 2. Displaced Community Member: objections created by themself OR by other owners associated with the same land
  if (filters.userRole === "DISPLACED_COMMUNITY_MEMBER" || filters.ownerNric) {
    const memberConditions: Prisma.ObjectionWhereInput[] = [];

    // Objections created by themself
    if (filters.userId) {
      memberConditions.push({ createdById: filters.userId });
    }

    // Objections associated with the same land (direct ownership or co-owners)
    if (filters.ownerNric) {
      const nricConditions = buildNricConditions(filters.ownerNric);

      memberConditions.push({
        offerLetter: {
          landOwnership: {
            landOwner: {
              OR: nricConditions,
            },
          },
        },
      });

      memberConditions.push({
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
      });
    }

    if (memberConditions.length > 0) {
      andConditions.push({
        OR: memberConditions,
      });
    }
  }

  if (filters.search) {
    const term = filters.search;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);

    const orConditions: Prisma.ObjectionWhereInput[] = [
      { acquisitionCase: { caseTitle: { contains: term, mode: "insensitive" } } },
      { objectionReason: { contains: term, mode: "insensitive" } },
      { offerLetter: { offerReferenceNo: { contains: term, mode: "insensitive" } } },
      { offerLetter: { landOwnership: { landOwner: { name: { contains: term, mode: "insensitive" } } } } },
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
    ];

    if (isUuid) {
      orConditions.push({ objectionId: term });
      orConditions.push({ offerId: term });
    }

    andConditions.push({ OR: orConditions });
  }

  const where: Prisma.ObjectionWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

  const [objections, total] = await Promise.all([
    prisma.objection.findMany({
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
        offerLetter: {
          include: {
            landOwnership: {
              include: {
                landOwner: true,
                landParcel: true,
              },
            },
          },
        },
        objectionDocuments: true,
        reviewedBy: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.objection.count({ where }),
  ]);

  return { objections, total, page, limit };
}

export async function getObjectionById(objectionId: string) {
  const objection = await prisma.objection.findUnique({
    where: { objectionId },
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
      offerLetter: {
        include: {
          landOwnership: {
            include: {
              landOwner: true,
              landParcel: true,
            },
          },
        },
      },
      objectionDocuments: true,
      reviewedBy: true,
    },
  });

  if (!objection) {
    throw new Error("Objection record not found");
  }

  return objection;
}

export async function createObjection(input: CreateObjectionInput) {
  const { offerId, caseId, objectionReason, requestedAmount, createdById } = input;

  const offer = await prisma.offerLetter.findUnique({
    where: { offerId },
    include: {
      acquisitionCase: {
        include: {
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
      landOwnership: {
        include: {
          landOwner: true,
        },
      },
      memberResponses: {
        include: {
          landOwner: true,
        },
      },
    },
  });
  if (!offer) throw new Error("Offer letter not found");

  // Validate or resolve user for createdById to prevent foreign key violation
  let validUserId = createdById;
  let user = null;
  if (validUserId) {
    user = await prisma.user.findUnique({ where: { userId: validUserId } });
    if (!user) {
      validUserId = undefined as any;
    }
  }

  if (!validUserId) {
    const defaultUser = await prisma.user.findFirst();
    if (!defaultUser) throw new Error("No valid user found to author the objection record");
    validUserId = defaultUser.userId;
    user = defaultUser;
  }

  // --- Business Logic: Grace Period Validation on Accepted Offer Letters ---
  const userNric = user?.identificationNumber?.trim();
  const cleanUserNric = userNric ? userNric.replace(/[^a-zA-Z0-9]/g, "") : "";

  // Check if this specific member has a response record
  const matchingMemberResp = (offer.memberResponses || []).find((mr) => {
    if (!userNric) return false;
    const oNric = (mr.landOwner?.nric || "").trim();
    const oClean = oNric.replace(/[^a-zA-Z0-9]/g, "");
    return oNric === userNric || (cleanUserNric && oClean === cleanUserNric);
  });

  // Determine if the offer has already been accepted (by member or overall)
  let isAccepted = false;
  let acceptanceTime: Date | null = null;

  if (matchingMemberResp && matchingMemberResp.status === OfferStatus.ACCEPTED) {
    isAccepted = true;
    acceptanceTime = matchingMemberResp.respondedAt || offer.acceptedAt || offer.updatedAt;
  } else if (offer.status === OfferStatus.ACCEPTED || offer.acceptedAt != null) {
    isAccepted = true;
    acceptanceTime = offer.acceptedAt || matchingMemberResp?.respondedAt || offer.updatedAt;
  }

  if (isAccepted && acceptanceTime) {
    const now = new Date();
    const diffHours = (now.getTime() - new Date(acceptanceTime).getTime()) / (1000 * 60 * 60);

    if (diffHours > 24) {
      throw new Error(
        "The 24-hour grace period for this accepted offer letter has expired. Objections cannot be submitted after the grace period."
      );
    }
  }

  const objection = await prisma.$transaction(async (tx) => {
    const createdObj = await tx.objection.create({
      data: {
        offerId,
        caseId,
        objectionReason,
        requestedAmount,
        status: ObjectionStatus.PENDING,
        createdById: validUserId,
      },
      include: {
        acquisitionCase: true,
        offerLetter: true,
      },
    });

    // If the member had previously accepted within grace period, update response to REJECTED (disputed)
    if (matchingMemberResp) {
      await tx.offerMemberResponse.upsert({
        where: {
          offerId_ownerId: {
            offerId,
            ownerId: matchingMemberResp.ownerId,
          },
        },
        create: {
          offerId,
          ownerId: matchingMemberResp.ownerId,
          status: OfferStatus.REJECTED,
          remarks: `Disputed via Compensation Objection (${createdObj.objectionId}) within 24-hour grace window`,
          respondedAt: new Date(),
        },
        update: {
          status: OfferStatus.REJECTED,
          remarks: `Disputed via Compensation Objection (${createdObj.objectionId}) within 24-hour grace window`,
          respondedAt: new Date(),
        },
      });
    }

    // Business Logic: Submitting an objection disputes the award.
    // Update the offer letter status to REJECTED and the case status to OFFER_REJECTED.
    await tx.offerLetter.update({
      where: { offerId },
      data: {
        status: OfferStatus.REJECTED,
        rejectedAt: new Date(),
        remarks: `Disputed via Objection (${createdObj.objectionId}): ${objectionReason.slice(0, 100)}`,
      },
    });

    if (caseId) {
      await tx.acquisitionCase.update({
        where: { caseId },
        data: {
          status: CaseStatus.OFFER_REJECTED,
        },
      });
    }

    return createdObj;
  });

  return objection;
}

export async function reviewObjection(input: ReviewObjectionInput) {
  const { objectionId, decision, revisedCompensation, reviewRemarks, reviewedById } = input;

  const objection = await prisma.objection.findUnique({
    where: { objectionId },
    include: {
      acquisitionCase: true,
      offerLetter: true,
    },
  });
  if (!objection) throw new Error("Objection record not found");

  // Validate reviewedById to prevent foreign key violation
  let validReviewerId: string | null = reviewedById || null;
  if (validReviewerId) {
    const userExists = await prisma.user.findUnique({ where: { userId: validReviewerId } });
    if (!userExists) {
      validReviewerId = null;
    }
  }

  if (!validReviewerId) {
    // Fallback to case creator or first available admin
    validReviewerId = objection.acquisitionCase?.createdById || objection.offerLetter?.createdById || null;
    if (!validReviewerId) {
      const defaultAdmin = await prisma.user.findFirst();
      validReviewerId = defaultAdmin ? defaultAdmin.userId : null;
    }
  }

  const newStatus = decision === "REJECTED" ? ObjectionStatus.REJECTED : ObjectionStatus.APPROVED;
  const decisionEnum = decision as Decision;
  const finalRevisedAmount = revisedCompensation !== undefined ? revisedCompensation : objection.requestedAmount;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedObj = await tx.objection.update({
      where: { objectionId },
      data: {
        status: newStatus,
        decision: decisionEnum,
        revisedCompensation: finalRevisedAmount,
        reviewRemarks,
        reviewDate: new Date(),
        resolutionDate: new Date(),
        reviewedById: validReviewerId,
      },
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
        offerLetter: {
          include: {
            landOwnership: {
              include: {
                landOwner: true,
                landParcel: true,
              },
            },
          },
        },
        objectionDocuments: true,
        reviewedBy: true,
      },
    });

    // Business Logic: If objection is APPROVED (or revised/accepted), update the offer letter amount to the revised compensation
    // and reset the offer letter status and member responses back to PENDING so the member can approve again.
    const targetOfferId =
      objection.offerId ||
      (objection.caseId
        ? (await tx.offerLetter.findFirst({ where: { caseId: objection.caseId } }))?.offerId
        : null);

    if (decision !== "REJECTED" && targetOfferId) {
      const updatedOffer = await tx.offerLetter.update({
        where: { offerId: targetOfferId },
        data: {
          offerAmount: finalRevisedAmount || objection.offerLetter?.offerAmount || 0,
          status: OfferStatus.PENDING,
          acceptedAt: null,
          rejectedAt: null,
          remarks: `Compensation revised via Objection (${objectionId}). Please review and approve revised offer.`,
        },
      });

      // Also update linked compensation report total compensation if exists
      if (updatedOffer.compensationReportId) {
        await tx.compensationReport.update({
          where: { compensationReportId: updatedOffer.compensationReportId },
          data: {
            totalCompensation: finalRevisedAmount,
            remarks: `Revised via approved Objection (${objectionId})`,
          },
        });
      }

      // Reset member responses to PENDING
      await tx.offerMemberResponse.updateMany({
        where: { offerId: targetOfferId },
        data: {
          status: OfferStatus.PENDING,
          remarks: null,
        },
      });

      // Update case status to OFFER_ISSUED
      const caseIdToUpdate = objection.caseId || updatedOffer.caseId;
      if (caseIdToUpdate) {
        await tx.acquisitionCase.update({
          where: { caseId: caseIdToUpdate },
          data: {
            status: CaseStatus.OFFER_ISSUED,
          },
        });
      }
    }

    return updatedObj;
  });

  return updated;
}

export interface UpdateObjectionInput {
  objectionId: string;
  objectionReason?: string;
  requestedAmount?: number;
}

export async function updateObjection(input: UpdateObjectionInput) {
  const { objectionId, objectionReason, requestedAmount } = input;

  const existing = await prisma.objection.findUnique({ where: { objectionId } });
  if (!existing) throw new Error("Objection record not found");

  const dataToUpdate: Prisma.ObjectionUpdateInput = {};
  if (objectionReason !== undefined) dataToUpdate.objectionReason = objectionReason;
  if (requestedAmount !== undefined) dataToUpdate.requestedAmount = requestedAmount;

  const updated = await prisma.objection.update({
    where: { objectionId },
    data: dataToUpdate,
    include: {
      acquisitionCase: true,
      offerLetter: true,
      objectionDocuments: true,
    },
  });

  return updated;
}

export async function deleteObjection(objectionId: string) {
  const existing = await prisma.objection.findUnique({
    where: { objectionId },
    include: {
      offerLetter: true,
      acquisitionCase: true,
    },
  });
  if (!existing) throw new Error("Objection record not found");

  const targetOfferId =
    existing.offerId ||
    (existing.caseId
      ? (await prisma.offerLetter.findFirst({ where: { caseId: existing.caseId } }))?.offerId
      : null);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Delete associated objection documents first
    await tx.objectionDocument.deleteMany({ where: { objectionId } });

    // 2. Delete the objection record
    await tx.objection.delete({ where: { objectionId } });

    // 3. Revert offer letter status to PENDING and reset remarks/rejections
    if (targetOfferId) {
      await tx.offerLetter.update({
        where: { offerId: targetOfferId },
        data: {
          status: OfferStatus.PENDING,
          rejectedAt: null,
          remarks: "Objection withdrawn/deleted. Offer status reset to Pending.",
        },
      });

      // Reset member responses
      await tx.offerMemberResponse.updateMany({
        where: { offerId: targetOfferId },
        data: {
          status: OfferStatus.PENDING,
          remarks: null,
        },
      });

      // 4. Revert case status to OFFER_ISSUED
      const caseIdToUpdate = existing.caseId || existing.offerLetter?.caseId;
      if (caseIdToUpdate) {
        await tx.acquisitionCase.update({
          where: { caseId: caseIdToUpdate },
          data: {
            status: CaseStatus.OFFER_ISSUED,
          },
        });
      }
    }

    return { success: true, message: "Objection deleted successfully and offer letter status reset to Pending" };
  });

  return result;
}

export async function approveObjection(input: ApproveObjectionInput) {
  const decision: "ACCEPTED" | "REVISED" = input.revisedCompensation ? "REVISED" : "ACCEPTED";
  return reviewObjection({
    objectionId: input.objectionId,
    decision,
    revisedCompensation: input.revisedCompensation,
    reviewRemarks: input.reviewRemarks || "Objection approved.",
    reviewedById: input.reviewedById || "",
  });
}


