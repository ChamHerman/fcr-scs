import { prisma } from "../prisma";
import { CaseStatus, ReportStatus, Prisma } from "@prisma/client";

export interface CompensationFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
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
    ];

    if (isUuid) {
      orConditions.push({ compensationReportId: term });
    }

    where.OR = orConditions;
  }

  const [reports, total] = await Promise.all([
    prisma.compensationReport.findMany({
      where,
      include: {
        acquisitionCase: {
          include: { project: true, landParcel: { include: { ownerships: { include: { landOwner: true } } } } },
        },
        valuationReport: true,
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
      valuationReport: true,
      approvedBy: true,
      reviewedBy: true,
    },
  });

  if (!report) {
    throw new Error("Compensation report not found");
  }

  return report;
}

export async function createReport(input: CreateCompensationReportInput) {
  const { caseId, valuationReportId, components, remarks, createdById } = input;

  const caseData = await prisma.acquisitionCase.findUnique({
    where: { caseId },
  });
  if (!caseData) throw new Error("Acquisition case not found");

  if (caseData.status !== CaseStatus.VALUATION_APPROVED) {
    throw new Error(`Cannot create compensation report for case in '${caseData.status}' status. Valuation must be APPROVED.`);
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

  // Threshold rule: >= 1,000,000 requires admin approval (PENDING), < 1,000,000 auto APPROVED
  const isThresholdHigh = total >= 1_000_000;
  const initialStatus = isThresholdHigh ? ReportStatus.PENDING : ReportStatus.APPROVED;
  const newCaseStatus = isThresholdHigh
    ? CaseStatus.PENDING_COMPENSATION_APPROVAL
    : CaseStatus.COMPENSATION_APPROVED;

  // Compare with AI / Valuation estimate (flag if > 20% diff)
  const valuationRec = Number(valReport.recommendedCompensation || 0);
  const diffPercent = valuationRec > 0 ? (Math.abs(total - valuationRec) / valuationRec) * 100 : 0;
  const warningFlag = diffPercent > 20 ? `[AI WARNING]: Difference of ${diffPercent.toFixed(1)}% exceeds 20% threshold.` : "";

  const finalRemarks = [remarks, warningFlag].filter(Boolean).join(" ");

  const result = await prisma.$transaction(async (tx) => {
    const report = await tx.compensationReport.create({
      data: {
        caseId,
        valuationReportId,
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

    await tx.acquisitionCase.update({
      where: { caseId },
      data: { status: newCaseStatus },
    });

    return { report, totalCompensation: total, warningFlag, requiresApproval: isThresholdHigh };
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

    await tx.acquisitionCase.update({
      where: { caseId: report.caseId },
      data: { status: CaseStatus.COMPENSATION_APPROVED },
    });

    return updated;
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
