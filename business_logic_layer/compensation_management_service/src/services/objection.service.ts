import { prisma } from "../prisma";
import { ObjectionStatus, Decision, Prisma } from "@prisma/client";

export interface ObjectionFilters {
  status?: string;
  search?: string;
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
  const where: Prisma.ObjectionWhereInput = {};

  if (filters.status) {
    where.status = filters.status as ObjectionStatus;
  }

  if (filters.search) {
    const term = filters.search;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);

    const orConditions: Prisma.ObjectionWhereInput[] = [
      { acquisitionCase: { caseTitle: { contains: term, mode: "insensitive" } } },
    ];

    if (isUuid) {
      orConditions.push({ objectionId: term });
    }

    where.OR = orConditions;
  }

  const [objections, total] = await Promise.all([
    prisma.objection.findMany({
      where,
      include: {
        acquisitionCase: { include: { project: true } },
        offerLetter: { include: { landOwnership: { include: { landOwner: true } } } },
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
      acquisitionCase: { include: { project: true, landParcel: true } },
      offerLetter: { include: { landOwnership: { include: { landOwner: true } } } },
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

  const objection = await prisma.objection.create({
    data: {
      offerId,
      caseId,
      objectionReason,
      requestedAmount,
      status: ObjectionStatus.SUBMITTED,
      createdById,
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

  const objection = await prisma.objection.findUnique({ where: { objectionId } });
  if (!objection) throw new Error("Objection record not found");

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
      reviewedById,
    },
    include: {
      acquisitionCase: true,
      offerLetter: true,
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

