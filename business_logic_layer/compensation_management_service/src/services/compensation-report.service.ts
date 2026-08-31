import { prisma } from "../prisma";
import { CaseStatus, ReportStatus, OfferStatus, Prisma } from "@prisma/client";

export interface CompensationFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  caseCreatedById?: string;
  userRole?: string;
  userId?: string;
}

export interface CompensationComponentsInput {
  landValue: number;
  buildingValue: number;
  cropValue: number;
  businessDisruption: number;
  disturbanceCompensation: number;
  relocationAllowance: number;
  otherEligible: number;
}

export interface CreateCompensationReportInput {
  caseId: string;
  valuationReportId: string;
  components: CompensationComponentsInput;
  remarks?: string;
  createdById: string;
}

async function getOrCreateLandOwnership(
  tx: Prisma.TransactionClient,
  caseId: string,
  _createdById?: string
): Promise<string> {
  const caseData = await tx.acquisitionCase.findUnique({
    where: { caseId },
    include: {
      landParcel: {
        include: {
          ownerships: true,
        },
      },
    },
  });

  const ownershipId = caseData?.landParcel?.ownerships?.[0]?.ownershipId;
  if (!ownershipId) {
    throw new Error(
      "No registered land owner found for this acquisition case. Please add a land owner to the case before issuing an offer letter."
    );
  }

  return ownershipId;
}

export async function getAllReports(filters: CompensationFilters) {
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const where: Prisma.CompensationReportWhereInput = {};

  if (filters.status) {
    where.status = filters.status as ReportStatus;
  }

  if (filters.search) {
    const term = filters.search;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);

    const orConditions: Prisma.CompensationReportWhereInput[] = [
      { acquisitionCase: { caseTitle: { contains: term, mode: "insensitive" } } },
      { caseId: { contains: term, mode: "insensitive" } },
    ];

    if (isUuid) {
      orConditions.push({ compensationReportId: term });
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

  const [reports, total] = await Promise.all([
    prisma.compensationReport.findMany({
      where,
      include: {
        acquisitionCase: {
          include: { project: true, landParcel: { include: { ownerships: { include: { landOwner: true } } } } },
        },
        valuationReport: true,
        offerLetters: true,
        approvedBy: true,
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.compensationReport.count({ where }),
  ]);

  return { reports, total, page, limit };
}

export async function getReportById(compensationReportId: string) {
  const report = await prisma.compensationReport.findUnique({
    where: { compensationReportId },
    include: {
      acquisitionCase: {
        include: {
          project: true,
          landParcel: {
            include: {
              ownerships: { include: { landOwner: true } },
            },
          },
          valuationReports: true,
          offerLetters: true,
        },
      },
      valuationReport: {
        include: { valuer: true },
      },
      offerLetters: true,
      approvedBy: true,
      reviewedBy: true,
    },
  });

  if (!report) {
    throw new Error("Compensation report not found");
  }

  // Calculate project budget details
  let projectBudget = 0;
  let totalApprovedUnderProject = 0;
  let remainingFundBefore = 0;
  let remainingFundAfter = 0;
  let isOverBudget = false;

  const projectId = report.acquisitionCase?.projectId;
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { projectId },
      include: {
        cases: {
          include: {
            compensationReports: {
              where: { status: ReportStatus.APPROVED },
            },
          },
        },
      },
    });

    if (project) {
      projectBudget = Number(project.budget || 0);

      let allApprovedSum = 0;
      let otherApprovedSum = 0;

      for (const c of project.cases) {
        for (const cr of c.compensationReports) {
          const amt = Number(cr.totalCompensation || 0);
          allApprovedSum += amt;
          if (cr.compensationReportId !== report.compensationReportId) {
            otherApprovedSum += amt;
          }
        }
      }

      const isCurrentApproved = report.status === ReportStatus.APPROVED;
      const currentReportAmount = Number(report.totalCompensation || 0);

      remainingFundBefore = projectBudget - otherApprovedSum;
      remainingFundAfter = remainingFundBefore - currentReportAmount;
      totalApprovedUnderProject = isCurrentApproved ? allApprovedSum : otherApprovedSum;
      isOverBudget = remainingFundAfter < 0;
    }
  }

  return {
    ...report,
    projectBudgetSummary: {
      projectId: projectId || "",
      projectName: report.acquisitionCase?.project?.projectName || "",
      projectType: report.acquisitionCase?.project?.projectType || "",
      totalBudget: projectBudget,
      totalApprovedUnderProject,
      remainingFund: report.status === ReportStatus.APPROVED ? remainingFundAfter : remainingFundBefore,
      remainingFundBefore,
      remainingFundAfter,
      currentReportAmount: Number(report.totalCompensation || 0),
      isOverBudget,
    },
  };
}

export async function createReport(input: CreateCompensationReportInput) {
  const { caseId, valuationReportId, components, remarks, createdById } = input;

  const caseData = await prisma.acquisitionCase.findUnique({
    where: { caseId },
  });
  if (!caseData) throw new Error("Acquisition case not found");

  if (
    caseData.status !== CaseStatus.VALUATION_APPROVED &&
    caseData.status !== CaseStatus.COMPENSATION_REJECTED
  ) {
    throw new Error(
      `Cannot create compensation report for case in '${caseData.status}' status. Status must be VALUATION_APPROVED or COMPENSATION_REJECTED.`
    );
  }

  const valReport = await prisma.valuationReport.findUnique({
    where: { reportId: valuationReportId },
  });
  if (!valReport) throw new Error("Valuation report not found");

  // Sum components
  const total =
    components.landValue +
    components.buildingValue +
    components.cropValue +
    components.businessDisruption +
    components.disturbanceCompensation +
    components.relocationAllowance +
    components.otherEligible;

  // Compare Land Value with Approved Recommended Valuation
  const valuationRec = Number(valReport.recommendedCompensation || 0);
  const landValueNum = Number(components.landValue || 0);
  const landDiff = valuationRec > 0 ? Math.abs(landValueNum - valuationRec) : 0;
  const isLandDiffOver100k = valuationRec > 0 && landDiff > 100_000;

  // Approval rule: If land value differs from recommended by > RM100,000 OR total >= 1,000,000,
  // it requires Government Admin review and approval (PENDING) - DO NOT generate offer letter yet.
  const requiresGovAdminApproval = total >= 1_000_000 || isLandDiffOver100k;
  const initialStatus = requiresGovAdminApproval ? ReportStatus.PENDING : ReportStatus.APPROVED;
  let newCaseStatus: CaseStatus = requiresGovAdminApproval
    ? CaseStatus.PENDING_COMPENSATION_APPROVAL
    : CaseStatus.COMPENSATION_APPROVED;

  const warningFlag = isLandDiffOver100k
    ? `[VARIANCE WARNING]: Land value of RM ${landValueNum.toLocaleString()} deviates by RM ${landDiff.toLocaleString()} from recommended value of RM ${valuationRec.toLocaleString()} (exceeds RM 100,000 threshold). Sent to Gov Admin for approval.`
    : "";

  const finalRemarks = [remarks, warningFlag].filter(Boolean).join(" ");

  const result = await prisma.$transaction(async (tx) => {
    const report = await tx.compensationReport.create({
      data: {
        caseId,
        valuationReportId,
        landValue: components.landValue,
        buildingValue: components.buildingValue,
        cropValue: components.cropValue,
        businessDisruption: components.businessDisruption,
        disturbanceCompensation: components.disturbanceCompensation,
        relocationAllowance: components.relocationAllowance,
        otherEligible: components.otherEligible,
        totalCompensation: total,
        status: initialStatus,
        remarks: finalRemarks,
        createdById,
        approvedAt: initialStatus === ReportStatus.APPROVED ? new Date() : null,
        approvedById: initialStatus === ReportStatus.APPROVED ? createdById : null,
      },
      include: {
        acquisitionCase: true,
        valuationReport: true,
      },
    });

    let offerLetter = null;
    if (initialStatus === ReportStatus.APPROVED) {
      const ownershipId = await getOrCreateLandOwnership(tx, caseId, createdById);

      const refNo = `OFFER-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      const SIX_WEEKS_MS = 42 * 24 * 60 * 60 * 1000;
      const offerDate = new Date(Date.now() + SIX_WEEKS_MS);
      const expiryDate = new Date(offerDate.getTime() + SIX_WEEKS_MS);

      offerLetter = await tx.offerLetter.create({
        data: {
          compensationReportId: report.compensationReportId,
          caseId,
          ownershipId,
          offerReferenceNo: refNo,
          offerType: "Form H (Standard Offer)",
          offerAmount: total,
          offerDate,
          expiryDate,
          acceptancePeriodDays: 42,
          status: OfferStatus.PENDING,
          remarks: "Auto-generated upon Compensation Report Creation",
          createdById,
        },
      });
      newCaseStatus = CaseStatus.OFFER_ISSUED;
    }

    await tx.acquisitionCase.update({
      where: { caseId },
      data: { status: newCaseStatus },
    });

    return {
      report,
      totalCompensation: total,
      warningFlag,
      requiresApproval: requiresGovAdminApproval,
      offerLetter,
    };
  });

  return result;
}

export async function approveReport(compensationReportId: string, approvedById: string) {
  const report = await prisma.compensationReport.findUnique({
    where: { compensationReportId },
  });
  if (!report) throw new Error("Compensation report not found");

  if (report.status !== ReportStatus.PENDING) {
    throw new Error(`Cannot approve report in '${report.status}' status`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.compensationReport.update({
      where: { compensationReportId },
      data: {
        status: ReportStatus.APPROVED,
        approvedById,
        approvedAt: new Date(),
      },
      include: { acquisitionCase: true },
    });

    const ownershipId = await getOrCreateLandOwnership(tx, report.caseId, approvedById);

    const refNo = `OFFER-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const SIX_WEEKS_MS = 42 * 24 * 60 * 60 * 1000;
    const offerDate = new Date(Date.now() + SIX_WEEKS_MS);
    const expiryDate = new Date(offerDate.getTime() + SIX_WEEKS_MS);

    const offerLetter = await tx.offerLetter.create({
      data: {
        compensationReportId: report.compensationReportId,
        caseId: report.caseId,
        ownershipId,
        offerReferenceNo: refNo,
        offerType: "Form H (Standard Offer)",
        offerAmount: report.totalCompensation || 0,
        offerDate,
        expiryDate,
        acceptancePeriodDays: 42,
        status: OfferStatus.PENDING,
        remarks: "Auto-generated upon Compensation Report Approval",
        createdById: report.createdById,
      },
    });

    await tx.acquisitionCase.update({
      where: { caseId: report.caseId },
      data: { status: CaseStatus.OFFER_ISSUED },
    });

    return { ...updated, offerLetter };
  });

  return result;
}

export async function rejectReport(compensationReportId: string, reason: string, reviewedById: string) {
  const report = await prisma.compensationReport.findUnique({
    where: { compensationReportId },
  });
  if (!report) throw new Error("Compensation report not found");

  if (report.status !== ReportStatus.PENDING) {
    throw new Error(`Cannot reject report in '${report.status}' status`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.compensationReport.update({
      where: { compensationReportId },
      data: {
        status: ReportStatus.REJECTED,
        reviewedById,
        remarks: reason ? `[REJECTED]: ${reason}` : report.remarks,
      },
      include: { acquisitionCase: true },
    });

    await tx.acquisitionCase.update({
      where: { caseId: report.caseId },
      data: { status: CaseStatus.COMPENSATION_REJECTED },
    });

    return updated;
  });

  return result;
}
