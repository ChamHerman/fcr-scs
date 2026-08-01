import { prisma } from "../prisma";
import { CaseStatus, AreaUnit, Prisma } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CaseFilters {
  search?: string;
  status?: string;
  projectType?: string;
  page?: number;
  limit?: number;
}

export interface CreateCaseInput {
  project: {
    projectName: string;
    projectType: string;
    purpose: string;
    budget: number;
    fundingSource: string;
  };
  land: {
    landTitleNo: string;
    lotNo: string;
    mukim: string;
    district: string;
    state: string;
    area: number;
    areaUnit: string;
    category: string;
    latitude: number;
    longitude: number;
  };
  owners: Array<{
    name: string;
    nric: string;
    address: string;
    contact: string;
    ownershipType: string;
  }>;
  caseTitle: string;
  remarks?: string;
  createdById: string;
}

export interface UpdateCaseInput {
  caseTitle?: string;
  remarks?: string;
  status?: CaseStatus;
}

export interface CaseDocumentInput {
  caseId: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  filePath: string;
  mimeType: string;
  checksum: string;
  createdById: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildWhereClause(filters: CaseFilters): Prisma.AcquisitionCaseWhereInput {
  const where: Prisma.AcquisitionCaseWhereInput = {};

  if (filters.status) {
    where.status = filters.status as CaseStatus;
  }

  if (filters.search) {
    const term = filters.search;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);
    
    const orConditions: Prisma.AcquisitionCaseWhereInput[] = [
      { caseTitle: { contains: term, mode: "insensitive" } },
      { project: { projectName: { contains: term, mode: "insensitive" } } },
    ];

    if (isUuid) {
      orConditions.push({ caseId: term });
    }

    where.OR = orConditions;
  }

  if (filters.projectType) {
    where.project = {
      ...(where.project as Prisma.ProjectWhereInput),
      projectType: { contains: filters.projectType, mode: "insensitive" },
    };
  }

  return where;
}

function parseAreaUnit(unit: string): AreaUnit {
  const map: Record<string, AreaUnit> = {
    "SQUARE_METER": AreaUnit.SQUARE_METER,
    "ACRE": AreaUnit.ACRE,
    "HECTARE": AreaUnit.HECTARE,
    "sqm": AreaUnit.SQUARE_METER,
    "acre": AreaUnit.ACRE,
    "hectare": AreaUnit.HECTARE,
  };
  return map[unit] || AreaUnit.HECTARE;
}

// ─── READ Operations (Phase 1) ────────────────────────────────────────────────

export async function getAllCases(filters: CaseFilters) {
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const where = buildWhereClause(filters);

  const [cases, total] = await Promise.all([
    prisma.acquisitionCase.findMany({
      where,
      include: {
        project: true,
        landParcel: {
          include: {
            ownerships: {
              include: { landOwner: true },
            },
          },
        },
        caseAssignments: {
          include: { assignedTo: true },
        },
        valuationReports: true,
        compensationReports: true,
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.acquisitionCase.count({ where }),
  ]);

  return { cases, total, page, limit };
}

export async function getCaseById(caseId: string) {
  const caseData = await prisma.acquisitionCase.findUnique({
    where: { caseId },
    include: {
      project: true,
      landParcel: {
        include: {
          ownerships: {
            include: { landOwner: true },
          },
        },
      },
      caseAssignments: {
        include: { assignedTo: true },
      },
      valuationReports: {
        include: { valuer: true },
      },
      compensationReports: true,
      offerLetters: true,
      caseDocuments: true,
      objections: true,
    },
  });

  if (!caseData) {
    throw new Error("Case not found");
  }

  return caseData;
}

export async function getCaseStats() {
  const statusCounts = await prisma.acquisitionCase.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const totalCases = statusCounts.reduce((sum, g) => sum + g._count._all, 0);

  const activeStatuses: CaseStatus[] = [
    CaseStatus.CASE_REGISTERED,
    CaseStatus.VALUER_ASSIGNED,
    CaseStatus.VALUATION_IN_PROGRESS,
    CaseStatus.PENDING_VALUATION_APPROVAL,
    CaseStatus.VALUATION_APPROVED,
    CaseStatus.PENDING_COMPENSATION_APPROVAL,
    CaseStatus.COMPENSATION_APPROVED,
    CaseStatus.OFFER_ISSUED,
    CaseStatus.PAYMENT_IN_PROGRESS,
  ];

  const active = statusCounts
    .filter((g) => activeStatuses.includes(g.status))
    .reduce((sum, g) => sum + g._count._all, 0);

  const completed = statusCounts
    .filter((g) => g.status === CaseStatus.PAYMENT_COMPLETED || g.status === CaseStatus.CASE_CLOSED)
    .reduce((sum, g) => sum + g._count._all, 0);

  const pendingAction = statusCounts
    .filter((g) =>
      g.status === CaseStatus.PENDING_VALUATION_APPROVAL ||
      g.status === CaseStatus.PENDING_COMPENSATION_APPROVAL
    )
    .reduce((sum, g) => sum + g._count._all, 0);

  const compensationAgg = await prisma.compensationReport.aggregate({
    _sum: { totalCompensation: true },
    where: { status: "APPROVED" },
  });

  return {
    totalCases,
    active,
    completed,
    pendingAction,
    totalCompensation: compensationAgg._sum.totalCompensation || 0,
    statusBreakdown: statusCounts.map((g) => ({
      status: g.status,
      count: g._count._all,
    })),
  };
}

export async function getUnassignedCases() {
  const cases = await prisma.acquisitionCase.findMany({
    where: {
      status: CaseStatus.CASE_REGISTERED,
      caseAssignments: { none: {} },
    },
    include: {
      project: true,
      landParcel: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return cases;
}

// ─── WRITE Operations (Phase 2) ───────────────────────────────────────────────

export async function createCase(input: CreateCaseInput) {
  const { project, land, owners, caseTitle, remarks, createdById } = input;

  // Check duplicate land title
  const existingLand = await prisma.landParcel.findUnique({
    where: { landTitleNo: land.landTitleNo },
  });
  if (existingLand) {
    throw new Error(`Land title number '${land.landTitleNo}' already exists`);
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create or find Project
    const dbProject = await tx.project.upsert({
      where: { projectName: project.projectName },
      update: {},
      create: {
        projectName: project.projectName,
        projectType: project.projectType,
        purpose: project.purpose,
        budget: project.budget,
        fundingSource: project.fundingSource,
        createdById,
      },
    });

    // 2. Create Acquisition Case
    const dbCase = await tx.acquisitionCase.create({
      data: {
        caseTitle,
        projectId: dbProject.projectId,
        status: CaseStatus.CASE_REGISTERED,
        registrationDate: new Date(),
        remarks: remarks || "",
        createdById,
      },
    });

    // 3. Create Land Parcel
    const dbLand = await tx.landParcel.create({
      data: {
        caseId: dbCase.caseId,
        landTitleNo: land.landTitleNo,
        lotNo: land.lotNo,
        mukim: land.mukim,
        district: land.district,
        state: land.state,
        area: land.area,
        areaUnit: parseAreaUnit(land.areaUnit),
        category: land.category,
        latitude: land.latitude,
        longitude: land.longitude,
        createdById,
      },
    });

    // 4. Create Owners and Ownerships
    for (const ownerInput of owners) {
      let dbOwner = await tx.landOwner.findFirst({
        where: { nric: ownerInput.nric },
      });

      if (!dbOwner) {
        dbOwner = await tx.landOwner.create({
          data: {
            name: ownerInput.name,
            nric: ownerInput.nric,
            address: ownerInput.address,
            contact: ownerInput.contact,
            createdById,
          },
        });
      }

      await tx.landOwnership.create({
        data: {
          landId: dbLand.landId,
          ownerId: dbOwner.ownerId,
          ownershipType: ownerInput.ownershipType,
          ownershipStart: new Date(),
          isCurrent: true,
          createdById,
        },
      });
    }

    return tx.acquisitionCase.findUnique({
      where: { caseId: dbCase.caseId },
      include: {
        project: true,
        landParcel: {
          include: {
            ownerships: { include: { landOwner: true } },
          },
        },
      },
    });
  });

  return result;
}

export async function updateCase(caseId: string, input: UpdateCaseInput) {
  const existing = await prisma.acquisitionCase.findUnique({
    where: { caseId },
  });
  if (!existing) throw new Error("Case not found");

  const editableStatuses: CaseStatus[] = [
    CaseStatus.CASE_REGISTERED,
    CaseStatus.VALUER_ASSIGNED,
  ];
  if (!editableStatuses.includes(existing.status)) {
    throw new Error(`Cannot update case in '${existing.status}' status`);
  }

  const updateData: Prisma.AcquisitionCaseUpdateInput = {};
  if (input.caseTitle) updateData.caseTitle = input.caseTitle;
  if (input.remarks !== undefined) updateData.remarks = input.remarks;
  if (input.status) updateData.status = input.status;

  const updatedCase = await prisma.acquisitionCase.update({
    where: { caseId },
    data: updateData,
    include: {
      project: true,
      landParcel: {
        include: {
          ownerships: { include: { landOwner: true } },
        },
      },
    },
  });

  return updatedCase;
}

export async function deleteCase(caseId: string) {
  const existing = await prisma.acquisitionCase.findUnique({
    where: { caseId },
    include: {
      landParcel: {
        include: { ownerships: true },
      },
      caseDocuments: true,
    },
  });

  if (!existing) throw new Error("Case not found");

  if (existing.status !== CaseStatus.CASE_REGISTERED) {
    throw new Error("Only cases in 'CASE_REGISTERED' status can be deleted");
  }

  await prisma.$transaction(async (tx) => {
    if (existing.caseDocuments.length > 0) {
      await tx.caseDocument.deleteMany({ where: { caseId } });
    }

    if (existing.landParcel) {
      await tx.landOwnership.deleteMany({
        where: { landId: existing.landParcel.landId },
      });
      await tx.landParcel.delete({
        where: { landId: existing.landParcel.landId },
      });
    }

    await tx.acquisitionCase.delete({ where: { caseId } });
  });

  return { success: true, caseId };
}

// ─── Document Operations (Phase 2 - Multer) ───────────────────────────────────

export async function addCaseDocument(input: CaseDocumentInput) {
  const caseData = await prisma.acquisitionCase.findUnique({
    where: { caseId: input.caseId },
  });
  if (!caseData) throw new Error("Case not found");

  const doc = await prisma.caseDocument.create({
    data: {
      caseId: input.caseId,
      documentType: input.documentType,
      fileName: input.fileName,
      fileSize: input.fileSize,
      filePath: input.filePath,
      mimeType: input.mimeType,
      checksum: input.checksum,
      createdById: input.createdById,
    },
  });

  return doc;
}

export async function deleteCaseDocument(documentId: string) {
  const doc = await prisma.caseDocument.findUnique({
    where: { documentId },
  });
  if (!doc) throw new Error("Document not found");

  await prisma.caseDocument.delete({
    where: { documentId },
  });

  return { success: true, documentId };
}
