import { BASE_URL, fetchJSON } from "./api";

export interface ReportFilterOptions {
  startDate?: string;
  endDate?: string;
  state?: string;
  status?: string;
  projectType?: string;
  location?: string;
}

export interface DashboardOverviewData {
  kpis: {
    totalCases: number;
    totalPayments: number;
    /** Total amount across all payment cases (the payment pipeline volume). */
    totalCompensationAmount: number;
    /** Member-confirmed payments (PAID). */
    totalPaidAmount: number;
    /** Money that left the bank (PAID + TRANSFER_SUCCEED). */
    totalSettledAmount: number;
    totalBlockchainRecords: number;
    publishedBlockchainRecords: number;
    readyToPublishBlockchainRecords: number;
    completedCases: number;
    activeCases: number;
    inValuation: number;
    inCompensation: number;
    inOffer: number;
    inPayment: number;
    rejectedCases: number;
  };
  caseStatusDistribution: Record<string, number>;
  paymentStatusDistribution: Record<string, { count: number; total: number }>;
  blockchainStatusDistribution: Record<string, number>;
  monthlyTrends: Record<string, number>;
}

export interface ReportGeneratedResponse {
  reportType: string;
  reportId: string;
  generatedAt: string;
  filterApplied: Record<string, string>;
  summary: any;
  details: any[];
}

function buildQuery(params?: Record<string, string | undefined>): string {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== "All" && value !== "All states" && value !== "All locations" && value !== "All statuses") {
      searchParams.append(key, value);
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function fetchDashboardOverview(): Promise<DashboardOverviewData> {
  return fetchJSON(`${BASE_URL}/api/reports/overview`);
}

export async function fetchCaseStatusReport(filters?: ReportFilterOptions): Promise<ReportGeneratedResponse> {
  const query = buildQuery(filters as Record<string, string>);
  return fetchJSON(`${BASE_URL}/api/reports/case-status${query}`);
}

export async function fetchPaymentReport(filters?: ReportFilterOptions): Promise<ReportGeneratedResponse> {
  const query = buildQuery(filters as Record<string, string>);
  return fetchJSON(`${BASE_URL}/api/reports/payment${query}`);
}

export async function fetchBlockchainAuditReport(filters?: ReportFilterOptions): Promise<ReportGeneratedResponse> {
  const query = buildQuery(filters as Record<string, string>);
  return fetchJSON(`${BASE_URL}/api/reports/blockchain-audit${query}`);
}

function resolveReportEndpoint(reportCategory: string): string {
  if (reportCategory.includes("Payment")) return "payment";
  if (reportCategory.includes("Blockchain")) return "blockchain-audit";
  return "case-status";
}

/**
 * Fetch the generated report PDF as a Blob without triggering a download.
 * Used by the preview-before-download flow; the caller decides when to save.
 */
export async function fetchReportPdfBlob(
  reportCategory: string,
  filters?: ReportFilterOptions
): Promise<Blob> {
  const endpoint = resolveReportEndpoint(reportCategory);
  const queryParams = { ...filters, format: "pdf" } as Record<string, string>;
  const query = buildQuery(queryParams);
  const url = `${BASE_URL}/api/reports/${endpoint}${query}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to generate report PDF (${response.status})`);
  }
  return response.blob();
}

export async function downloadReportPdf(
  reportCategory: "Case Status Report" | "Payment Report" | "Blockchain Audit Report" | string,
  filters?: ReportFilterOptions
): Promise<void> {
  const endpoint = resolveReportEndpoint(reportCategory);
  const blob = await fetchReportPdfBlob(reportCategory, filters);

  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  const fileName = `FCR-${endpoint}-Report-${Date.now()}.pdf`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}
