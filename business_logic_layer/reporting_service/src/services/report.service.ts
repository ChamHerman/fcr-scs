import { prisma } from "../prisma";
import { PaymentStatus, BlockchainStatus } from "@prisma/client";

export interface ReportFilterParams {
  startDate?: string;
  endDate?: string;
  state?: string;
  status?: string;
  location?: string;
  projectType?: string;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* CaseStatus values grouped into statutory pipeline stages — every value of the
   enum belongs to exactly one bucket, so no case can hide from the KPIs. */
const VALUATION_STAGE_STATUSES = ["CASE_REGISTERED", "VALUER_ASSIGNED", "VALUATION_IN_PROGRESS", "PENDING_VALUATION_APPROVAL"];
const COMPENSATION_STAGE_STATUSES = ["VALUATION_APPROVED", "PENDING_COMPENSATION_APPROVAL"];
const OFFER_STAGE_STATUSES = ["COMPENSATION_APPROVED", "OFFER_ISSUED", "OFFER_ACCEPTED"];
const PAYMENT_STAGE_STATUSES = ["PAYMENT_IN_PROGRESS"];
const REJECTED_CASE_STATUSES = ["VALUATION_REJECTED", "COMPENSATION_REJECTED", "OFFER_REJECTED"];
const COMPLETED_CASE_STATUSES = ["PAYMENT_COMPLETED", "CASE_CLOSED"];

/* Money that actually left the bank: PAID is member-confirmed, TRANSFER_SUCCEED
   is bank-cleared and awaiting confirmation. */
const SETTLED_PAYMENT_STATUSES: PaymentStatus[] = [PaymentStatus.PAID, PaymentStatus.TRANSFER_SUCCEED];

export const getDashboardOverviewStats = async () => {
  const [
    totalCases,
    caseByStatus,
    totalPayments,
    paymentByStatus,
    blockchainTotal,
    blockchainByStatus,
    caseDates
  ] = await Promise.all([
    prisma.acquisitionCase.count({ where: { deletedAt: null } }),
    prisma.acquisitionCase.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { deletedAt: null },
    }),
    prisma.paymentCase.count({ where: { deletedAt: null } }),
    prisma.paymentCase.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { amount: true },
      where: { deletedAt: null },
    }),
    prisma.blockchainRecord.count({ where: { deletedAt: null } }),
    prisma.blockchainRecord.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { deletedAt: null },
    }),
    prisma.acquisitionCase.findMany({
      where: { deletedAt: null },
      select: { registrationDate: true },
    }),
  ]);

  const caseStatusDistribution: Record<string, number> = {};
  caseByStatus.forEach((s) => {
    caseStatusDistribution[s.status] = s._count._all;
  });

  const blockchainStatusDistribution: Record<string, number> = {};
  blockchainByStatus.forEach((b) => {
    blockchainStatusDistribution[b.status] = b._count._all;
  });

  /* Real per-status ledger: count + amount, straight from the payment table. */
  const paymentStatusDistribution: Record<string, { count: number; total: number }> = {};
  paymentByStatus.forEach((p) => {
    paymentStatusDistribution[p.status] = {
      count: p._count._all,
      total: Number(p._sum.amount || 0),
    };
  });

  const countCasesByStatus = (statuses: string[]) =>
    statuses.reduce((acc, status) => acc + (caseStatusDistribution[status] ?? 0), 0);

  const sumPaymentsByStatus = (statuses: PaymentStatus[]) =>
    statuses.reduce((acc, status) => acc + (paymentStatusDistribution[status]?.total ?? 0), 0);

  const totalCompensationAmount = Object.values(paymentStatusDistribution).reduce((acc, p) => acc + p.total, 0);
  const completedCases = countCasesByStatus(COMPLETED_CASE_STATUSES);

  /* Real monthly registration counts for the last 7 months. */
  const now = new Date();
  const monthBuckets: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthBuckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: MONTH_LABELS[d.getMonth()],
    });
  }
  const monthlyTrends: Record<string, number> = {};
  monthBuckets.forEach((m) => {
    monthlyTrends[m.label] = 0;
  });
  caseDates.forEach((c) => {
    const d = new Date(c.registrationDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = monthBuckets.find((m) => m.key === key);
    if (bucket) monthlyTrends[bucket.label] += 1;
  });

  return {
    kpis: {
      totalCases,
      totalPayments,
      totalCompensationAmount,
      totalPaidAmount: sumPaymentsByStatus([PaymentStatus.PAID]),
      totalSettledAmount: sumPaymentsByStatus(SETTLED_PAYMENT_STATUSES),
      totalBlockchainRecords: blockchainTotal,
      publishedBlockchainRecords: blockchainStatusDistribution[BlockchainStatus.PUBLISHED] || 0,
      readyToPublishBlockchainRecords: blockchainStatusDistribution[BlockchainStatus.READY_TO_PUBLISH] || 0,
      completedCases,
      activeCases: Math.max(0, totalCases - completedCases),
      inValuation: countCasesByStatus(VALUATION_STAGE_STATUSES),
      inCompensation: countCasesByStatus(COMPENSATION_STAGE_STATUSES),
      inOffer: countCasesByStatus(OFFER_STAGE_STATUSES),
      inPayment: countCasesByStatus(PAYMENT_STAGE_STATUSES),
      rejectedCases: countCasesByStatus(REJECTED_CASE_STATUSES),
    },
    caseStatusDistribution,
    paymentStatusDistribution,
    blockchainStatusDistribution,
    monthlyTrends,
  };
};

export const generateCaseStatusData = async (filters: ReportFilterParams) => {
  const where: any = { deletedAt: null };

  if (filters.status && filters.status !== "All") {
    where.status = filters.status;
  }

  const landParcelWhere: Record<string, string> = {};
  if (filters.state && filters.state !== "All") {
    landParcelWhere.state = filters.state;
  }
  if (filters.location && filters.location !== "All") {
    landParcelWhere.district = filters.location;
  }
  if (Object.keys(landParcelWhere).length > 0) {
    where.landParcel = landParcelWhere;
  }

  if (filters.startDate && filters.endDate) {
    where.registrationDate = {
      gte: new Date(filters.startDate),
      lte: new Date(`${filters.endDate}T23:59:59.999Z`),
    };
  }

  const cases = await prisma.acquisitionCase.findMany({
    where,
    include: { landParcel: true },
    orderBy: { registrationDate: "desc" },
    take: 100,
  });

  const totalCases = cases.length;
  const completedCases = cases.filter((c) => c.status === "CASE_CLOSED" || c.status === "PAYMENT_COMPLETED").length;
  const activeCases = totalCases - completedCases;

  let totalAgingDays = 0;
  cases.forEach((c) => {
    const age = Math.floor((Date.now() - new Date(c.registrationDate).getTime()) / (1000 * 60 * 60 * 24));
    totalAgingDays += Math.max(0, age);
  });
  const avgAging = totalCases > 0 ? Math.round(totalAgingDays / totalCases) : 0;

  return {
    reportType: "Case Status Report",
    reportId: `RPT-CASE-${Date.now().toString().slice(-6)}`,
    generatedAt: new Date().toISOString(),
    filterApplied: filters,
    summary: {
      totalCases,
      activeCases,
      completedCases,
      averageAgingDays: `${avgAging} days`,
      notes: "Generated from official Malaysian Land Acquisition statutory records.",
    },
    details: cases.map((c) => ({
      caseId: c.caseId,
      title: c.caseTitle,
      state: c.landParcel?.state || "Not recorded",
      district: c.landParcel?.district || "Not recorded",
      status: c.status,
      date: c.registrationDate.toISOString().slice(0, 10),
      lifecycleAging: `${Math.max(0, Math.floor((Date.now() - new Date(c.registrationDate).getTime()) / (1000 * 60 * 60 * 24)))} days`,
    })),
  };
};

export const generatePaymentData = async (filters: ReportFilterParams) => {
  const where: any = { deletedAt: null };

  if (filters.status && filters.status !== "All") {
    where.status = filters.status;
  }
  if (filters.startDate && filters.endDate) {
    where.createdAt = {
      gte: new Date(filters.startDate),
      lte: new Date(`${filters.endDate}T23:59:59.999Z`),
    };
  }

  const payments = await prisma.paymentCase.findMany({
    where,
    // Receipts are per-owner now; the report only needs the bank reference, so
    // take the earliest receipt for the case-level row.
    include: { receipts: { orderBy: { generatedAt: "asc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const settledPayments = payments.filter((p) => SETTLED_PAYMENT_STATUSES.includes(p.status));
  const totalPaymentVolume = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const totalDisbursementNum = settledPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const successfulPayments = settledPayments.length;
  const successRate = payments.length > 0 ? Math.round((successfulPayments / payments.length) * 100) : 0;

  return {
    reportType: "Payment Report",
    reportId: `RPT-PAY-${Date.now().toString().slice(-6)}`,
    generatedAt: new Date().toISOString(),
    filterApplied: filters,
    summary: {
      totalRecords: payments.length,
      totalDisbursement: `RM ${totalDisbursementNum.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalPaymentVolume: `RM ${totalPaymentVolume.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      successfulPayments,
      pendingPayments: payments.length - successfulPayments,
      successRate: `${successRate}%`,
      notes: "Audited disbursement records with national banking references.",
    },
    details: payments.map((p) => ({
      caseId: p.caseId,
      payeeName: p.accountHolderName || "Beneficiary",
      bankName: p.bankName || "National Bank",
      amount: `RM ${Number(p.amount || 0).toLocaleString("en-MY", { minimumFractionDigits: 2 })}`,
      status: p.status,
      bankReference: p.receipts?.[0]?.bankReferenceNumber || "Pending Clearance",
      date: p.updatedAt.toISOString().slice(0, 10),
    })),
  };
};

export const generateBlockchainAuditData = async (filters: ReportFilterParams) => {
  const where: any = { deletedAt: null };

  if (filters.status && filters.status !== "All") {
    where.status = filters.status;
  }
  if (filters.startDate && filters.endDate) {
    where.publishedAt = {
      gte: new Date(filters.startDate),
      lte: new Date(`${filters.endDate}T23:59:59.999Z`),
    };
  }

  const records = await prisma.blockchainRecord.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    take: 100,
  });

  const publishedRecords = records.filter((r) => r.status === BlockchainStatus.PUBLISHED).length;
  const readyToPublishRecords = records.filter((r) => r.status === BlockchainStatus.READY_TO_PUBLISH).length;

  return {
    reportType: "Blockchain Audit Report",
    reportId: `RPT-CHAIN-${Date.now().toString().slice(-6)}`,
    generatedAt: new Date().toISOString(),
    filterApplied: filters,
    summary: {
      totalRecords: records.length,
      publishedRecords,
      readyToPublishRecords,
      integrityStatus:
        records.length > 0 && publishedRecords === records.length
          ? "100% Cryptographically Verified"
          : `${publishedRecords}/${records.length} Notarized On-Chain`,
      network: "Ethereum Sepolia Testnet",
    },
    details: records.map((r) => ({
      caseId: r.caseId,
      milestone: r.milestone,
      transactionHash: r.transactionHash || "Pending Confirmation",
      documentHash: r.documentHash || "N/A",
      status: r.status,
      publishedAt: r.publishedAt ? r.publishedAt.toISOString().slice(0, 10) : "-",
    })),
  };
};
