import { prisma } from "../prisma";
import { CaseStatus, ReportStatus, Prisma } from "@prisma/client";
import type {
  ValuationFiltersDTO as ValuationFilters,
  CreateValuationInputDTO as CreateValuationInput,
} from "../interfaces/valuation.interface";


export async function getAllReports(filters: ValuationFilters) {
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const where: Prisma.ValuationReportWhereInput = {};

  if (filters.status) {
    where.reportStatus = filters.status as ReportStatus;
  }

  if (filters.search) {
    const term = filters.search;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);

    const orConditions: Prisma.ValuationReportWhereInput[] = [
      { acquisitionCase: { caseTitle: { contains: term, mode: "insensitive" } } },
      { valuer: { name: { contains: term, mode: "insensitive" } } },
      { caseId: { contains: term, mode: "insensitive" } },
    ];

    if (isUuid) {
      orConditions.push({ reportId: term });
    }

    where.OR = orConditions;
  }

  // 1. Government Officer: only reports under cases created by this officer
  if (filters.caseCreatedById) {
    where.acquisitionCase = {
      ...(where.acquisitionCase as Prisma.AcquisitionCaseWhereInput),
      createdById: filters.caseCreatedById,
    };
  } else if (filters.userRole === "GOVERNMENT_OFFICER" && filters.userId) {
    where.acquisitionCase = {
      ...(where.acquisitionCase as Prisma.AcquisitionCaseWhereInput),
      createdById: filters.userId,
    };
  }

  // 2. Land Valuer: only reports evaluated by or assigned to this valuer
  if (filters.valuerId) {
    where.OR = [
      ...(where.OR || []),
      { valuerId: filters.valuerId },
      { acquisitionCase: { caseAssignments: { some: { assignedToId: filters.valuerId } } } },
    ];
  } else if (filters.userRole === "LAND_VALUER" && filters.userId) {
    where.OR = [
      ...(where.OR || []),
      { valuerId: filters.userId },
      { acquisitionCase: { caseAssignments: { some: { assignedToId: filters.userId } } } },
    ];
  }

  const [reports, total] = await Promise.all([
    prisma.valuationReport.findMany({
      where,
      include: {
        acquisitionCase: {
          include: {
            project: true,
            landParcel: true,
            caseAssignments: {
              include: { assignedTo: true },
            },
          },
        },
        valuer: true,
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.valuationReport.count({ where }),
  ]);

  return { reports, total, page, limit };
}

export async function getReportById(reportId: string) {
  const report = await prisma.valuationReport.findUnique({
    where: { reportId },
    include: {
      acquisitionCase: {
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
              ownerships: { include: { landOwner: true } },
            },
          },
          caseDocuments: true,
        },
      },
      valuer: true,
    },
  });

  if (!report) {
    throw new Error("Valuation report not found");
  }

  // Calculate project budget details for reference
  let projectBudget = 0;
  let totalApprovedUnderProject = 0;
  let remainingFund = 0;
  const project = report.acquisitionCase?.project;

  if (project) {
    projectBudget = Number(project.budget || 0);
    for (const c of project.cases || []) {
      for (const cr of c.compensationReports || []) {
        totalApprovedUnderProject += Number(cr.totalCompensation || 0);
      }
    }
    remainingFund = projectBudget - totalApprovedUnderProject;
  }

  const recComp = Number(report.recommendedCompensation || 0);
  const remainingFundAfter = remainingFund - recComp;

  return {
    ...report,
    projectBudgetSummary: {
      projectId: project?.projectId || "",
      projectName: project?.projectName || "",
      projectType: project?.projectType || "",
      totalBudget: projectBudget,
      totalApprovedUnderProject,
      remainingFund,
      remainingFundBefore: remainingFund,
      remainingFundAfter,
      currentReportAmount: recComp,
      isOverBudget: remainingFundAfter < 0,
    },
  };
}

export async function createOrUpdateReport(input: CreateValuationInput) {
  const {
    caseId,
    valuerId,
    valuationMethod,
    locationType,
    buildingAge,
    landArea,
    acquisitionArea,
    builtUpArea,
    marketRatePerSqMeter,
    compensationRatePerSqMeter,
    aiValuationPrice,
    marketValue,
    recommendedCompensation,
    remarks,
    createdById,
  } = input;

  const caseData = await prisma.acquisitionCase.findUnique({
    where: { caseId },
    include: { valuationReports: true, caseAssignments: true },
  });

  if (!caseData) throw new Error("Case not found");

  const allowedStatuses: CaseStatus[] = [
    CaseStatus.CASE_REGISTERED,
    CaseStatus.VALUER_ASSIGNED,
    CaseStatus.VALUATION_IN_PROGRESS,
    CaseStatus.VALUATION_REJECTED,
  ];

  if (!allowedStatuses.includes(caseData.status)) {
    throw new Error(`Cannot submit valuation report for case in '${caseData.status}' status`);
  }

  const targetValuerId = valuerId || caseData.caseAssignments[0]?.assignedToId || createdById;

  const result = await prisma.$transaction(async (tx) => {
    // Always create a new report so previous reports are preserved for history and traceability
    const report = await tx.valuationReport.create({
      data: {
        caseId,
        valuerId: targetValuerId,
        valuationDate: new Date(),
        valuationMethod,
        locationType: locationType != null ? locationType : undefined,
        buildingAge: buildingAge != null ? buildingAge : undefined,
        landArea: landArea != null ? landArea : undefined,
        acquisitionArea: acquisitionArea != null ? acquisitionArea : undefined,
        builtUpArea: builtUpArea != null ? builtUpArea : undefined,
        marketRatePerSqMeter: marketRatePerSqMeter != null ? marketRatePerSqMeter : undefined,
        compensationRatePerSqMeter: compensationRatePerSqMeter != null ? compensationRatePerSqMeter : undefined,
        aiValuationPrice: aiValuationPrice != null ? aiValuationPrice : undefined,
        marketValue,
        recommendedCompensation,
        remarks: remarks || "",
        reportStatus: ReportStatus.PENDING,
        createdById,
      },
      include: { acquisitionCase: true, valuer: true },
    });

    // Link valuationReport to the latest case assignment
    const assignment = await tx.caseAssignment.findFirst({
      where: { caseId },
      orderBy: { createdAt: "desc" },
    });

    if (assignment) {
      await tx.caseAssignment.update({
        where: { assignmentId: assignment.assignmentId },
        data: { valuationReportId: report.reportId },
      });
    }

    // Update AcquisitionCase status
    await tx.acquisitionCase.update({
      where: { caseId },
      data: { status: CaseStatus.PENDING_VALUATION_APPROVAL },
    });

    return report;
  });

  return result;
}

export async function approveReport(reportId: string, _reviewerId?: string) {
  const report = await prisma.valuationReport.findUnique({
    where: { reportId },
  });

  if (!report) throw new Error("Valuation report not found");

  if (report.reportStatus !== ReportStatus.PENDING) {
    throw new Error(`Cannot approve report in '${report.reportStatus}' status`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedReport = await tx.valuationReport.update({
      where: { reportId },
      data: { reportStatus: ReportStatus.APPROVED },
      include: { acquisitionCase: true, valuer: true },
    });

    await tx.acquisitionCase.update({
      where: { caseId: report.caseId },
      data: { status: CaseStatus.VALUATION_APPROVED },
    });

    return updatedReport;
  });

  return result;
}

export async function rejectReport(reportId: string, reason: string, _acceptancePeriodDays?: number, _reviewerId?: string) {
  const report = await prisma.valuationReport.findUnique({
    where: { reportId },
  });

  if (!report) throw new Error("Valuation report not found");

  if (report.reportStatus !== ReportStatus.PENDING) {
    throw new Error(`Cannot reject report in '${report.reportStatus}' status`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedReport = await tx.valuationReport.update({
      where: { reportId },
      data: {
        reportStatus: ReportStatus.REJECTED,
        remarks: reason ? `[REJECTED]: ${reason}` : report.remarks,
      },
      include: { acquisitionCase: true, valuer: true },
    });

    await tx.acquisitionCase.update({
      where: { caseId: report.caseId },
      data: { status: CaseStatus.VALUATION_REJECTED },
    });

    return updatedReport;
  });

  return result;
}
