import { prisma } from "../prisma";
import { CaseStatus, ReportStatus, Prisma } from "@prisma/client";

export interface ValuationFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateValuationInput {
  caseId: string;
  valuerId?: string;
  valuationMethod: string;
  marketValue: number;
  recommendedCompensation: number;
  remarks: string;
  createdById: string;
}

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
    ];

    if (isUuid) {
      orConditions.push({ reportId: term });
    }

    where.OR = orConditions;
  }

  const [reports, total] = await Promise.all([
    prisma.valuationReport.findMany({
      where,
      include: {
        acquisitionCase: {
          include: { project: true, landParcel: true },
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
          project: true,
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

  return report;
}

export async function createOrUpdateReport(input: CreateValuationInput) {
  const { caseId, valuerId, valuationMethod, marketValue, recommendedCompensation, remarks, createdById } = input;

  const caseData = await prisma.acquisitionCase.findUnique({
    where: { caseId },
    include: { valuationReports: true },
  });

  if (!caseData) throw new Error("Case not found");

  const allowedStatuses: CaseStatus[] = [
    CaseStatus.VALUER_ASSIGNED,
    CaseStatus.VALUATION_IN_PROGRESS,
    CaseStatus.VALUATION_REJECTED,
  ];

  if (!allowedStatuses.includes(caseData.status)) {
    throw new Error(`Cannot submit valuation report for case in '${caseData.status}' status`);
  }

  const existingReport = caseData.valuationReports[0];
  const targetValuerId = valuerId || existingReport?.valuerId || createdById;

  const result = await prisma.$transaction(async (tx) => {
    let report;

    if (existingReport) {
      report = await tx.valuationReport.update({
        where: { reportId: existingReport.reportId },
        data: {
          valuationDate: new Date(),
          valuationMethod,
          marketValue,
          recommendedCompensation,
          remarks,
          reportStatus: ReportStatus.PENDING,
          createdById,
        },
        include: { acquisitionCase: true, valuer: true },
      });
    } else {
      report = await tx.valuationReport.create({
        data: {
          caseId,
          valuerId: targetValuerId,
          valuationDate: new Date(),
          valuationMethod,
          marketValue,
          recommendedCompensation,
          remarks,
          reportStatus: ReportStatus.PENDING,
          createdById,
        },
        include: { acquisitionCase: true, valuer: true },
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
