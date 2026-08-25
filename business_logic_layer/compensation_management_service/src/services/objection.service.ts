import { prisma } from "../prisma";
import { ObjectionStatus, Decision, Prisma } from "@prisma/client";

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

export async function getAllObjections(filters: ObjectionFilters) {
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const andConditions: Prisma.ObjectionWhereInput[] = [];

  if (filters.status) {
    andConditions.push({ status: filters.status as ObjectionStatus });
  }

  // 1. Government Officer Supervision: only objections under cases created/supervised by this officer
  if (filters.caseCreatedById || (filters.userRole === "GOVERNMENT_OFFICER" && filters.userId) || (filters.userId && !filters.ownerNric && filters.userRole !== "DISPLACED_COMMUNITY_MEMBER")) {
    const targetUserId = filters.caseCreatedById || filters.userId;
    if (targetUserId) {
      andConditions.push({
        OR: [
          { acquisitionCase: { createdById: targetUserId } },
          { offerLetter: { createdById: targetUserId } },
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

  const offer = await prisma.offerLetter.findUnique({ where: { offerId } });
  if (!offer) throw new Error("Offer letter not found");

  // Validate or resolve user for createdById to prevent foreign key violation
  let validUserId = createdById;
  if (validUserId) {
    const userExists = await prisma.user.findUnique({ where: { userId: validUserId } });
    if (!userExists) {
      validUserId = undefined as any;
    }
  }

  if (!validUserId) {
    const defaultUser = await prisma.user.findFirst();
    if (!defaultUser) throw new Error("No valid user found to author the objection record");
    validUserId = defaultUser.userId;
  }

  const objection = await prisma.objection.create({
    data: {
      offerId,
      caseId,
      objectionReason,
      requestedAmount,
      status: ObjectionStatus.SUBMITTED,
      createdById: validUserId,
    },
    include: {
      acquisitionCase: true,
      offerLetter: true,
    },
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

  const updated = await prisma.objection.update({
    where: { objectionId },
    data: {
      status: newStatus,
      decision: decisionEnum,
      revisedCompensation: revisedCompensation !== undefined ? revisedCompensation : objection.requestedAmount,
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
  const existing = await prisma.objection.findUnique({ where: { objectionId } });
  if (!existing) throw new Error("Objection record not found");

  // Delete associated objection documents first
  await prisma.objectionDocument.deleteMany({ where: { objectionId } });

  await prisma.objection.delete({ where: { objectionId } });
  return { success: true, message: "Objection deleted successfully" };
}

