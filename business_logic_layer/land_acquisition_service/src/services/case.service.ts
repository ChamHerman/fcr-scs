import { prisma } from "../prisma";
import { CaseStatus, AreaUnit, FundingSource, LandCategory, TenureType, OwnershipType, UserRole, Prisma, AlertChannel, AlertUrgency, ReportStatus, ObjectionStatus } from "@prisma/client";
import { CaseStateMachine } from "../utils/case-state.machine";
import { parseLandCategory, parseTenureType, parseOwnershipType, formatOwnershipType } from "../utils/enum.utils";
import { sendTemplatedEmail } from "../../../user_management_service/src/utils/email.service";
import { generateCustomId } from "../../../user_management_service/src/utils/idGenerator";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CaseFilters {
  search?: string;
  status?: string;
  projectType?: string;
  page?: number;
  limit?: number;
  createdById?: string;
  assignedToId?: string;
  userRole?: string;
  userId?: string;
  ownerNric?: string;
}

export interface CreateCaseInput {
  caseId?: string;
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
    tempat?: string;
    mukim: string;
    district: string;
    state: string;
    area: number;
    areaUnit: string;
    category: string;
    tenureType?: string;
  };
  owners: Array<{
    name: string;
    nric: string;
    address: string;
    contact: string;
    email?: string;
    ownershipType: string;
    share?: string;
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
    email?: string;
    ownershipType: string;
    share?: string;
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
    
    const orConditions: Prisma.AcquisitionCaseWhereInput[] = [
      { caseId: { contains: term, mode: "insensitive" } },
      { caseTitle: { contains: term, mode: "insensitive" } },
      { project: { projectName: { contains: term, mode: "insensitive" } } },
    ];

    where.OR = orConditions;
  }

  if (filters.projectType) {
    where.project = {
      ...(where.project as Prisma.ProjectWhereInput),
      projectType: { contains: filters.projectType, mode: "insensitive" },
    };
  }

  // 1. Direct createdById filter or via userRole = GOVERNMENT_OFFICER
  if (filters.createdById) {
    where.createdById = filters.createdById;
  } else if (filters.userRole === "GOVERNMENT_OFFICER" && filters.userId) {
    where.createdById = filters.userId;
  }

  // 2. Direct assignedToId filter or via userRole = LAND_VALUER
  const now = new Date();
  if (filters.userRole === "LAND_VALUER") {
    const valuerId = filters.userId || filters.assignedToId;
    if (valuerId) {
      where.caseAssignments = {
        some: {
          assignedToId: valuerId,
          deletedAt: null,
          OR: [
            { dueDate: { gte: now } },
            { valuationReportId: { not: null } },
            { acquisitionCase: { valuationReports: { some: {} } } },
          ],
        },
      };
    }
  } else if (filters.assignedToId) {
    where.caseAssignments = {
      some: {
        assignedToId: filters.assignedToId,
        deletedAt: null,
      },
    };
  }

  // 3. Displaced Community Member: cases associated with user's land parcel or created by user
  if (filters.userRole === "DISPLACED_COMMUNITY_MEMBER" || filters.ownerNric) {
    const memberOrConditions: Prisma.AcquisitionCaseWhereInput[] = [];
    if (filters.userId) {
      memberOrConditions.push({ createdById: filters.userId });
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

      memberOrConditions.push({
        landParcel: {
          ownerships: {
            some: {
              landOwner: {
                OR: nricConditions,
              },
            },
          },
        },
      });
    }

    if (memberOrConditions.length > 0) {
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: memberOrConditions },
        ];
        delete where.OR;
      } else {
        where.OR = memberOrConditions;
      }
    }
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

function parseFundingSource(val: any): FundingSource {
  if (!val) return FundingSource.GOVERNMENT;
  const upper = String(val).toUpperCase().trim();
  if (upper.includes("GOV")) return FundingSource.GOVERNMENT;
  if (upper.includes("PRIV")) return FundingSource.PRIVATE;
  if (upper.includes("OTHER")) return FundingSource.OTHERS;
  return (FundingSource as any)[upper] || FundingSource.GOVERNMENT;
}

// ─── READ Operations (Phase 1) ────────────────────────────────────────────────

export async function getAllProjects() {
  return prisma.project.findMany({
    where: { deletedAt: null },
    orderBy: { projectName: "asc" },
    include: {
      _count: {
        select: { cases: true },
      },
    },
  });
}

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
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
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
      project: {
        include: {
          cases: {
            include: {
              compensationReports: {
                where: { status: "APPROVED" },
              },
            },
          },
        },
      },
      landParcel: {
        include: {
          ownerships: {
            include: { landOwner: true },
          },
        },
      },
      caseAssignments: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
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

  // Calculate project budget details for reference
  let projectBudget = 0;
  let totalApprovedUnderProject = 0;
  let remainingFund = 0;

  if (caseData.project) {
    projectBudget = Number(caseData.project.budget || 0);
    for (const c of caseData.project.cases || []) {
      for (const cr of c.compensationReports || []) {
        totalApprovedUnderProject += Number(cr.totalCompensation || 0);
      }
    }
    remainingFund = projectBudget - totalApprovedUnderProject;
  }

  return {
    ...caseData,
    projectBudgetSummary: {
      projectId: caseData.project?.projectId || "",
      projectName: caseData.project?.projectName || "",
      projectType: caseData.project?.projectType || "",
      totalBudget: projectBudget,
      totalApprovedUnderProject,
      remainingFund,
    },
  };
}

export async function getCaseStats(filters?: CaseFilters) {
  const where = filters ? buildWhereClause(filters) : {};

  const statusCounts = await prisma.acquisitionCase.groupBy({
    by: ["status"],
    where,
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

  // Filter compensation aggregate with cases in scope if any where conditions exist
  const compensationWhere: Prisma.CompensationReportWhereInput = {
    status: "APPROVED",
  };
  if (Object.keys(where).length > 0) {
    compensationWhere.acquisitionCase = where;
  }

  const compensationAgg = await prisma.compensationReport.aggregate({
    _sum: { totalCompensation: true },
    where: compensationWhere,
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

export async function getDashboardOverviewStats() {
  const [
    totalCases,
    caseByStatus,
    totalValuations,
    valByStatus,
    totalCompensations,
    compByStatus,
    totalObjections,
    objectionByStatus,
    systemUsers,
    unackAlerts,
  ] = await Promise.all([
    prisma.acquisitionCase.count({ where: { deletedAt: null } }),
    prisma.acquisitionCase.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.valuationReport.count({ where: { deletedAt: null } }),
    prisma.valuationReport.groupBy({
      by: ["reportStatus"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.compensationReport.count({ where: { deletedAt: null } }),
    prisma.compensationReport.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.objection.count({ where: { deletedAt: null } }),
    prisma.objection.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.user.count({ where: { deletedAt: null, isActive: true } }),
    prisma.systemAlert.count({ where: { isAcknowledged: false } }),
  ]);

  const activeCases = caseByStatus
    .filter((g) => CaseStateMachine.isActive(g.status))
    .reduce((sum, g) => sum + g._count._all, 0);

  const pendingValuations = valByStatus
    .filter((g) => g.reportStatus === ReportStatus.PENDING)
    .reduce((sum, g) => sum + g._count._all, 0);

  const pendingCompensations = compByStatus
    .filter((g) => g.status === ReportStatus.PENDING)
    .reduce((sum, g) => sum + g._count._all, 0);

  const activeObjections = objectionByStatus
    .filter((g) => g.status === ObjectionStatus.PENDING)
    .reduce((sum, g) => sum + g._count._all, 0);

  return {
    totalCases,
    activeCases: activeCases || totalCases,
    totalValuations,
    pendingValuations,
    totalCompensations,
    pendingCompensations,
    totalObjections,
    activeObjections,
    systemUsers,
    alertsToday: unackAlerts,
  };
}

export async function getUnassignedCases() {
  const cases = await prisma.acquisitionCase.findMany({
    where: {
      status: CaseStatus.CASE_REGISTERED,
      caseAssignments: { none: { deletedAt: null } },
    },
    include: {
      project: true,
      landParcel: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return cases;
}

/**
 * Generates system Case ID based on format: LAC-YYYY-MM-XXXX (e.g. LAC-2026-08-0001)
 */
export async function generateCaseId(tx?: Prisma.TransactionClient): Promise<string> {
  const client = tx || prisma;
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `LAC-${year}-${month}-`;

  const lastCase = await client.acquisitionCase.findFirst({
    where: { caseId: { startsWith: prefix } },
    orderBy: { caseId: "desc" },
    select: { caseId: true },
  });

  let nextSeq = 1;
  if (lastCase?.caseId) {
    const parts = lastCase.caseId.split("-");
    const lastSeqNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeqNum)) {
      nextSeq = lastSeqNum + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

// Retain alias for backwards compatibility if needed
export const generateNextCaseId = generateCaseId;

export async function createCase(input: CreateCaseInput) {
  const { caseId: customCaseId, project, land, owners, caseTitle, remarks, createdById } = input;

  // Check duplicate land title
  const existingLand = await prisma.landParcel.findUnique({
    where: { landTitleNo: land.landTitleNo },
  });
  if (existingLand) {
    throw new Error(`Land title number '${land.landTitleNo}' already exists`);
  }

  // Resolve valid createdById (must exist in user table to satisfy foreign keys)
  let validCreatorId: string | undefined = createdById;
  if (validCreatorId) {
    const existingUser = await prisma.user.findUnique({
      where: { userId: validCreatorId },
    });
    if (!existingUser || !existingUser.isActive) {
      validCreatorId = undefined;
    }
  }

  if (!validCreatorId) {
    const fallbackUser = await prisma.user.findFirst({
      where: {
        role: { in: [UserRole.GOVERNMENT_OFFICER, UserRole.SYSTEM_ADMINISTRATOR, UserRole.GOVERNMENT_ADMINISTRATOR] },
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
    });
    if (!fallbackUser) {
      throw new Error("No active system user found to associate with case creation.");
    }
    validCreatorId = fallbackUser.userId;
  }

  const finalCreatorId: string = validCreatorId;

  const result = await prisma.$transaction(async (tx) => {
    // Generate Case ID using LAC-YYYY-MM-XXXX format
    const caseId = customCaseId || await generateCaseId(tx);

    // 1. Create or find Project
    const dbProject = await tx.project.upsert({
      where: { projectName: project.projectName },
      update: {},
      create: {
        projectName: project.projectName,
        projectType: project.projectType,
        purpose: project.purpose,
        budget: project.budget,
        fundingSource: parseFundingSource(project.fundingSource),
        createdById: finalCreatorId,
      },
    });

    // 2. Create Acquisition Case
    const dbCase = await tx.acquisitionCase.create({
      data: {
        caseId,
        caseTitle,
        projectId: dbProject.projectId,
        status: CaseStatus.CASE_REGISTERED,
        registrationDate: new Date(),
        remarks: remarks || "",
        createdById: finalCreatorId,
      },
    });

    // 3. Create Land Parcel
    const dbLand = await tx.landParcel.create({
      data: {
        caseId: dbCase.caseId,
        landTitleNo: land.landTitleNo,
        lotNo: land.lotNo,
        tempat: land.tempat || "",
        mukim: land.mukim,
        district: land.district,
        state: land.state,
        area: land.area,
        areaUnit: parseAreaUnit(land.areaUnit),
        category: parseLandCategory(land.category),
        tenureType: parseTenureType(land.tenureType),
        createdById: finalCreatorId,
      },
    });

    // 4. Validate and Create Owners and Ownerships
    const ownerNrics = owners.map((o) => (o.nric || "").replace(/\D/g, "")).filter(Boolean);
    const uniqueNrics = new Set(ownerNrics);
    if (uniqueNrics.size !== ownerNrics.length) {
      throw new Error("Duplicate identification number (NRIC) detected across multiple owners. Each owner must have a unique NRIC.");
    }

    const ownerEmails = owners.map((o) => (o.email || "").trim().toLowerCase()).filter(Boolean);
    const uniqueEmails = new Set(ownerEmails);
    if (uniqueEmails.size !== ownerEmails.length) {
      throw new Error("Duplicate email address detected across multiple owners. Each owner must have a unique email address.");
    }

    const ownerContacts = owners.map((o) => (o.contact || "").replace(/[\s\-+]/g, "")).filter(Boolean);
    const uniqueContacts = new Set(ownerContacts);
    if (uniqueContacts.size !== ownerContacts.length) {
      throw new Error("Duplicate phone number detected across multiple owners. Each owner must have a unique phone number.");
    }

    for (const ownerInput of owners) {
      const pureNric = (ownerInput.nric || "").replace(/\D/g, "");
      if (!pureNric) continue;

      const ownerEmail = (ownerInput.email || "").trim().toLowerCase();
      const contact = (ownerInput.contact || "").trim();

      // Check database collision with existing User accounts
      if (ownerEmail) {
        const existingEmailUser = await tx.user.findFirst({
          where: {
            email: { equals: ownerEmail, mode: "insensitive" },
          },
          select: { userId: true, identificationNumber: true, email: true, name: true, role: true },
        });
        if (existingEmailUser) {
          // Reject if the existing user is an administrative or non-community-member account
          if (existingEmailUser.role !== UserRole.DISPLACED_COMMUNITY_MEMBER) {
            throw new Error(`Email address '${ownerInput.email}' belongs to an administrative account (${existingEmailUser.role.replace(/_/g, ' ')}). Administrative personnel cannot be registered as affected landowners.`);
          }
          const existingPureNric = (existingEmailUser.identificationNumber || "").replace(/\D/g, "");
          if (existingPureNric && existingPureNric !== pureNric) {
            throw new Error(`Email address '${ownerInput.email}' is already registered to another user account (${existingEmailUser.name}, NRIC mismatch). Please use a unique email or enter the matching NRIC.`);
          }
        }
      }

      // Check NRIC collision with existing non-community member users
      const existingNricUser = await tx.user.findFirst({
        where: {
          OR: [
            { identificationNumber: pureNric },
            { identificationNumber: (ownerInput.nric || "").trim() },
          ],
        },
        select: { userId: true, identificationNumber: true, email: true, name: true, role: true },
      });
      if (existingNricUser && existingNricUser.role !== UserRole.DISPLACED_COMMUNITY_MEMBER) {
        throw new Error(`NRIC '${ownerInput.nric}' belongs to an administrative account (${existingNricUser.role.replace(/_/g, ' ')}). Administrative personnel cannot be registered as affected landowners.`);
      }

      if (contact) {
        const cleanContact = contact.replace(/[\s\-+]/g, "");
        const existingPhoneUser = await tx.user.findFirst({
          where: {
            contactNumber: { in: [contact, cleanContact] },
            role: UserRole.DISPLACED_COMMUNITY_MEMBER,
          },
          select: { userId: true, identificationNumber: true, contactNumber: true, name: true },
        });
        if (existingPhoneUser) {
          const existingPureNric = (existingPhoneUser.identificationNumber || "").replace(/\D/g, "");
          if (existingPureNric && existingPureNric !== pureNric) {
            throw new Error(`Phone number '${contact}' is already registered to another account (NRIC mismatch).`);
          }
        }
      }

      let dbOwner = await tx.landOwner.findFirst({
        where: { nric: pureNric },
      });

      const ownerName = (ownerInput.name || "").trim() || "Land Owner";
      const ownerAddress = (ownerInput.address || "").trim() || "";
      const email = ownerEmail ? ownerEmail : null;

      if (!dbOwner) {
        dbOwner = await tx.landOwner.create({
          data: {
            name: ownerName,
            nric: pureNric,
            address: ownerAddress,
            contact,
            email,
            createdById: finalCreatorId,
          },
        });
      } else {
        dbOwner = await tx.landOwner.update({
          where: { ownerId: dbOwner.ownerId },
          data: {
            nric: pureNric,
            ...(ownerName && { name: ownerName }),
            ...(ownerAddress && { address: ownerAddress }),
            ...(contact && { contact }),
            ...(email !== null && { email }),
          },
        });
      }

      await tx.landOwnership.create({
        data: {
          landId: dbLand.landId,
          ownerId: dbOwner.ownerId,
          ownershipType: parseOwnershipType(ownerInput.ownershipType),
          share: ownerInput.share || "1/1",
          ownershipStart: new Date(),
          isCurrent: true,
          createdById: finalCreatorId,
        },
      });

      // Auto-provision a user account for the landowner if none exists yet
      if (pureNric.length === 12 && ownerEmail) {
        const rawNric = (ownerInput.nric || "").trim();
        const existingAccount = await tx.user.findFirst({
          where: {
            OR: [
              { identificationNumber: pureNric },
              { identificationNumber: rawNric },
              { email: { equals: ownerEmail, mode: "insensitive" } },
            ],
          },
        });

        if (existingAccount) {
          console.log(`[CaseService] Landowner account already exists for ${ownerEmail} (UserId: ${existingAccount.userId}, Role: ${existingAccount.role}). Attaching case notification.`);

          // 1. Create In-App SystemAlert for existing landowner
          const alertId = await generateCustomId("systemAlert", tx);
          await tx.systemAlert.create({
            data: {
              alertId,
              recipientId: existingAccount.userId,
              alertType: "CASE_CREATED",
              channel: AlertChannel.IN_APP,
              urgencyLevel: AlertUrgency.HIGH,
              caseReference: dbCase.caseId,
              message: `You have been registered as an affected landowner for land acquisition case: ${dbCase.caseTitle} (${dbCase.caseId}). Please review your case details.`,
              isAcknowledged: false,
            },
          });

          // 2. Notify existing landowner account about the newly attached case
          const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
          sendTemplatedEmail(existingAccount.email, "SYSTEM_ALERT", {
            name: existingAccount.name,
            alertType: "NEW_CASE_ATTACHED",
            message: `You have been registered as an affected landowner for new land acquisition case ${dbCase.caseTitle} (${dbCase.caseId}). Please log in to your portal to review case information.`,
            severity: "INFO",
            ruleName: "New Land Acquisition Case Notification",
            timestamp: new Date().toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" }),
            caseId: dbCase.caseId,
            caseReference: dbCase.caseId,
            caseTitle: dbCase.caseTitle,
            actionUrl: `${frontendUrl}/member`,
            buttonText: "View Case in Portal",
            portalLink: `${frontendUrl}/member`,
          }).catch((err) => {
            console.warn(`[CaseService] Non-fatal notification failure to existing landowner ${existingAccount.email}:`, err);
          });
        }
      }
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

  const { projectName, projectType, purpose, budget, fundingSource } = projectInput;

  return prisma.project.update({
    where: { projectId: existing.projectId },
    data: {
      ...(projectName && { projectName }),
      ...(projectType && { projectType }),
      ...(purpose && { purpose }),
      ...(budget !== undefined && budget !== null && { budget: typeof budget === "string" ? parseFloat(budget) : budget }),
      ...(fundingSource && { fundingSource: parseFundingSource(fundingSource) }),
    },
  });
}

export async function updateLandInformation(caseId: string, landInput: any) {
  const existing = await prisma.acquisitionCase.findUnique({
    where: { caseId },
    select: { status: true, landParcel: { select: { landId: true } } },
  });
  if (!existing) throw new Error("Case not found");
  if (!CaseStateMachine.isEditable(existing.status)) {
    throw new Error(`Cannot update case in '${existing.status}' status`);
  }
  if (!existing.landParcel?.landId) throw new Error("Land parcel record not associated with this case");

  const {
    landTitleNo,
    lotNo,
    tempat,
    mukim,
    district,
    state,
    area,
    category,
    tenureType,
  } = landInput;

  return prisma.landParcel.update({
    where: { landId: existing.landParcel.landId },
    data: {
      ...(landTitleNo && { landTitleNo }),
      ...(lotNo && { lotNo }),
      ...(tempat !== undefined && { tempat: tempat || null }),
      ...(mukim && { mukim }),
      ...(district && { district }),
      ...(state && { state }),
      ...(area !== undefined && area !== null && { area: typeof area === "string" ? parseFloat(area) : area }),
      ...(category && { category: parseLandCategory(category) }),
      ...(tenureType && { tenureType: parseTenureType(tenureType) }),
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

  const ownerNrics = (ownersInput || [])
    .map((o) => (o.nric || o.icNumber || "").replace(/\D/g, ""))
    .filter(Boolean);
  const uniqueNrics = new Set(ownerNrics);
  if (uniqueNrics.size !== ownerNrics.length) {
    throw new Error("Duplicate identification number (NRIC) detected across multiple owners. Each owner must have a unique NRIC.");
  }

  return prisma.$transaction(async (tx) => {
    const updatedOwnerIds: string[] = [];
    const activeOwnershipIds: string[] = [];

    for (const ownerInput of ownersInput) {
      const pureNric = (ownerInput.nric || ownerInput.icNumber || "").replace(/\D/g, "");
      const contact = (ownerInput.contact || ownerInput.phone || "").trim();
      const email = ownerInput.email ? ownerInput.email.trim() : null;
      const share = ownerInput.share || (ownersInput.length === 1 ? "100" : "50");
      const ownershipType = parseOwnershipType(ownerInput.ownershipType);

      if (!pureNric) continue;

      let dbOwner = await tx.landOwner.findFirst({
        where: { nric: pureNric },
      });

      const name = (ownerInput.name || "").trim() || "Land Owner";
      const address = (ownerInput.address || "").trim() || "";

      if (dbOwner) {
        dbOwner = await tx.landOwner.update({
          where: { ownerId: dbOwner.ownerId },
          data: {
            nric: pureNric,
            ...(name && { name }),
            ...(address && { address }),
            ...(contact && { contact }),
            ...(email !== undefined && { email }),
          },
        });
      } else {
        dbOwner = await tx.landOwner.create({
          data: {
            name,
            nric: pureNric,
            address,
            contact,
            email,
            createdById: existing.createdById,
          },
        });
      }

      updatedOwnerIds.push(dbOwner.ownerId);

      const existingOwnership = await tx.landOwnership.findFirst({
        where: { landId, ownerId: dbOwner.ownerId },
      });

      if (existingOwnership) {
        const updatedOwnership = await tx.landOwnership.update({
          where: { ownershipId: existingOwnership.ownershipId },
          data: {
            ownershipType,
            share: String(share),
            isCurrent: true,
          },
        });
        activeOwnershipIds.push(updatedOwnership.ownershipId);
      } else {
        const newOwnership = await tx.landOwnership.create({
          data: {
            landId,
            ownerId: dbOwner.ownerId,
            ownershipType,
            share: String(share),
            ownershipStart: new Date(),
            isCurrent: true,
            createdById: existing.createdById,
          },
        });
        activeOwnershipIds.push(newOwnership.ownershipId);
      }
    }

    // Clean up any ownerships for this land parcel that were removed
    if (activeOwnershipIds.length > 0) {
      await tx.landOwnership.deleteMany({
        where: {
          landId,
          ownershipId: { notIn: activeOwnershipIds },
        },
      });
    }

    return tx.landParcel.findUnique({
      where: { landId },
      include: {
        ownerships: { include: { landOwner: true } },
      },
    });
  });
}

export async function updateCaseTitle(caseId: string, caseTitle: string) {
  const existing = await prisma.acquisitionCase.findUnique({
    where: { caseId },
  });
  if (!existing) throw new Error("Case not found");

  if (!CaseStateMachine.isEditable(existing.status)) {
    throw new Error(`Cannot update case in '${existing.status}' status`);
  }

  const trimmedTitle = (caseTitle || "").trim();
  if (!trimmedTitle) {
    throw new Error("Case title cannot be empty");
  }

  return prisma.acquisitionCase.update({
    where: { caseId },
    data: { caseTitle: trimmedTitle },
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

  const titleValue = input.caseTitle || (input as any).caseName || (input as any).title;

  const updateData: Prisma.AcquisitionCaseUpdateInput = {};
  if (titleValue !== undefined && titleValue !== null && titleValue.trim()) {
    updateData.caseTitle = titleValue.trim();
  }
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
