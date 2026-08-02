import { prisma } from "../prisma";
import { CaseStatus, AreaUnit, Prisma } from "@prisma/client";
import { CaseStateMachine } from "../utils/case-state.machine";


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
  project?: {
    projectName?: string;
    projectType?: string;
    purpose?: string;
    budget?: number;
    fundingSource?: string;
  };
  land?: {
    landTitleNo?: string;
    lotNo?: string;
    mukim?: string;
    district?: string;
    state?: string;
    area?: number;
    category?: string;
    latitude?: number;
    longitude?: number;
  };
  owners?: Array<{
    name: string;
    nric: string;
    address: string;
    contact: string;
    ownershipType: string;
  }>;
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

  const active = statusCounts
    .filter((g) => CaseStateMachine.isActive(g.status))
    .reduce((sum, g) => sum + g._count._all, 0);

  const completed = statusCounts
    .filter((g) => CaseStateMachine.isCompleted(g.status))
    .reduce((sum, g) => sum + g._count._all, 0);

  const pendingAction = statusCounts
    .filter((g) => CaseStateMachine.isPendingAction(g.status))
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

export async function updateProjectInformation(caseId: string, projectInput: any) {
  const existing = await prisma.acquisitionCase.findUnique({
    where: { caseId },
    select: { projectId: true, status: true },
  });
  if (!existing) throw new Error("Case not found");
  if (!CaseStateMachine.isEditable(existing.status)) {
    throw new Error(`Cannot update case in '${existing.status}' status`);
  }
  if (!existing.projectId) throw new Error("Project record not associated with this case");

  const projectName = projectInput.projectName;
  const projectType = projectInput.projectType;
  const purpose = projectInput.purpose || projectInput.projectPurpose;
  const budget = projectInput.budget !== undefined ? projectInput.budget : projectInput.projectBudget;
  const fundingSource = projectInput.fundingSource;

  return prisma.project.update({
    where: { projectId: existing.projectId },
    data: {
      ...(projectName && { projectName }),
      ...(projectType && { projectType }),
      ...(purpose && { purpose }),
      ...(budget !== undefined && budget !== null && { budget: typeof budget === "string" ? parseFloat(budget) : budget }),
      ...(fundingSource && { fundingSource }),
    },
  });
}

export async function updateLandInformation(caseId: string, landInput: any) {
  const existing = await prisma.acquisitionCase.findUnique({
    where: { caseId },
    include: { landParcel: true },
  });
  if (!existing) throw new Error("Case not found");
  if (!CaseStateMachine.isEditable(existing.status)) {
    throw new Error(`Cannot update case in '${existing.status}' status`);
  }
  if (!existing.landParcel?.landId) throw new Error("Land parcel record not associated with this case");

  const landTitleNo = landInput.landTitleNo || landInput.landTitleNumber;
  const lotNo = landInput.lotNo || landInput.lotNumber;
  const mukim = landInput.mukim;
  const district = landInput.district;
  const state = landInput.state;
  const area = landInput.area !== undefined ? landInput.area : landInput.landArea;
  const category = landInput.category || landInput.landCategory;
  const latitude = landInput.latitude !== undefined ? landInput.latitude : landInput.gpsLatitude;
  const longitude = landInput.longitude !== undefined ? landInput.longitude : landInput.gpsLongitude;

  return prisma.landParcel.update({
    where: { landId: existing.landParcel.landId },
    data: {
      ...(landTitleNo && { landTitleNo }),
      ...(lotNo && { lotNo }),
      ...(mukim && { mukim }),
      ...(district && { district }),
      ...(state && { state }),
      ...(area !== undefined && area !== null && { area: typeof area === "string" ? parseFloat(area) : area }),
      ...(category && { category }),
      ...(latitude !== undefined && latitude !== null && { latitude: typeof latitude === "string" ? parseFloat(latitude) : latitude }),
      ...(longitude !== undefined && longitude !== null && { longitude: typeof longitude === "string" ? parseFloat(longitude) : longitude }),
    },
  });
}

export async function updateOwnerInformation(caseId: string, ownersInput: any[]) {
  const existing = await prisma.acquisitionCase.findUnique({
    where: { caseId },
    include: { landParcel: true },
  });
  if (!existing) throw new Error("Case not found");
  if (!CaseStateMachine.isEditable(existing.status)) {
    throw new Error(`Cannot update case in '${existing.status}' status`);
  }
  if (!existing.landParcel?.landId) throw new Error("Land parcel record not associated with this case");

  const landId = existing.landParcel.landId;

  return prisma.$transaction(async (tx) => {
    for (const ownerInput of ownersInput) {
      const nric = ownerInput.nric || ownerInput.icNumber;
      const contact = ownerInput.contact || ownerInput.phone;
      const name = ownerInput.name;
      const address = ownerInput.address;
      const ownershipType = ownerInput.ownershipType || "Individual";

      if (!nric) continue;

      let dbOwner = await tx.landOwner.findFirst({
        where: { nric },
      });

      if (dbOwner) {
        dbOwner = await tx.landOwner.update({
          where: { ownerId: dbOwner.ownerId },
          data: {
            ...(name && { name }),
            ...(address && { address }),
            ...(contact && { contact }),
          },
        });
      } else {
        dbOwner = await tx.landOwner.create({
          data: {
            name: name || "Land Owner",
            nric,
            address: address || "",
            contact: contact || "",
            createdById: existing.createdById,
          },
        });
      }

      const existingOwnership = await tx.landOwnership.findFirst({
        where: { landId, ownerId: dbOwner.ownerId },
      });

      if (existingOwnership) {
        await tx.landOwnership.update({
          where: { ownershipId: existingOwnership.ownershipId },
          data: {
            ownershipType,
            isCurrent: true,
          },
        });
      } else {
        await tx.landOwnership.create({
          data: {
            landId,
            ownerId: dbOwner.ownerId,
            ownershipType,
            ownershipStart: new Date(),
            isCurrent: true,
            createdById: existing.createdById,
          },
        });
      }
    }

    return tx.landParcel.findUnique({
      where: { landId },
      include: {
        ownerships: { include: { landOwner: true } },
      },
    });
  });
}

export async function updateCase(caseId: string, input: UpdateCaseInput) {
  const existing = await prisma.acquisitionCase.findUnique({
    where: { caseId },
    include: { landParcel: true },
  });
  if (!existing) throw new Error("Case not found");

  if (!CaseStateMachine.isEditable(existing.status)) {
    throw new Error(`Cannot update case in '${existing.status}' status`);
  }

  if (input.project) {
    await updateProjectInformation(caseId, input.project);
  }

  if (input.land) {
    await updateLandInformation(caseId, input.land);
  }

  if (input.owners) {
    await updateOwnerInformation(caseId, input.owners);
  }

  const updateData: Prisma.AcquisitionCaseUpdateInput = {};
  if (input.caseTitle) updateData.caseTitle = input.caseTitle;
  if (input.remarks !== undefined) updateData.remarks = input.remarks;
  if (input.status) updateData.status = input.status;

  return prisma.acquisitionCase.update({
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

  if (!CaseStateMachine.canDelete(existing.status)) {
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
