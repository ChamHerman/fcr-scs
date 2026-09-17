import React from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Pagination } from '../../components/ui/Pagination';
import { CopyButton } from '../../components/ui/CopyButton';
import { useTableSort } from '../../constants';
import type { ReportGeneratedResponse } from '../../services/reportApi';
import { reportStatusLabel } from './reportConstants';
import { paymentBadge } from '../Payment/paymentModals';
import { normalizePaymentStatus, paymentStatusClassMap } from '../Payment/statusMaps';
import '../LandAcquisition/case_management.css';
import '../Payment/payment.css';

/* ─────────────────────── Design-system status badges ─────────────────────── */

/* Mirrors the STATUS_BADGES palette in DesignSystem.tsx. */
const STATUS_STYLES = {
  green: { bg: 'bg-[#e6f4ea]', fg: 'text-[#1e7b4a]', dot: 'bg-[#1e7b4a]' },
  amber: { bg: 'bg-[#fef7e0]', fg: 'text-[#8d6e00]', dot: 'bg-[#8d6e00]' },
  red: { bg: 'bg-[#fce8e6]', fg: 'text-[#b3261e]', dot: 'bg-[#b3261e]' },
  blue: { bg: 'bg-[#e3f2fd]', fg: 'text-[#0b5b8c]', dot: 'bg-[#0b5b8c]' },
} as const;

/* Settled / approved milestones. */
const GREEN_STATUSES = [
  'CASE CLOSED',
  'PAYMENT COMPLETED',
  'PAID',
  'TRANSFER SUCCEED',
  'PUBLISHED',
  'VALUATION APPROVED',
  'COMPENSATION APPROVED',
  'OFFER ACCEPTED',
  'APPROVED',
  'COMPLETED',
];

/* Rejections, failures and blocked money. */
const RED_STATUSES = [
  'VALUATION REJECTED',
  'COMPENSATION REJECTED',
  'OFFER REJECTED',
  'TRANSFER REJECTED',
  'TRANSFER FAILED',
  'CANCELLED',
  'DISPUTED',
  'NEW BANK DETAILS PENDING',
  'REJECTED',
  'FAILED',
  'VOIDED',
];

/* Newly registered or informational. */
const BLUE_STATUSES = ['CASE REGISTERED', 'REGISTERED', 'READY TO PUBLISH', 'NOTARIZED'];

/** Normalises enum values (TRANSFER_SUCCEED) and title-case labels alike. */
function normaliseStatus(status: string): string {
  return status
    .toUpperCase()
    .replace(/&/g, 'AND')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function statusStyle(status: string) {
  const s = normaliseStatus(status);
  if (GREEN_STATUSES.includes(s)) return STATUS_STYLES.green;
  if (RED_STATUSES.includes(s)) return STATUS_STYLES.red;
  if (BLUE_STATUSES.includes(s)) return STATUS_STYLES.blue;
  return STATUS_STYLES.amber;
}

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const norm = normalizePaymentStatus(status);
  if (norm && paymentStatusClassMap[norm]) {
    return paymentBadge(norm);
  }
  const style = statusStyle(status);
  return (
    <span className={`payment-badge ${style.bg} ${style.fg} whitespace-nowrap`}>
      <span className={`dot ${style.dot}`} />
      {reportStatusLabel(status)}
    </span>
  );
};

/* ─────────────────────────── Summary KPI cards ─────────────────────────── */

export const ReportSummaryCards: React.FC<{ data: ReportGeneratedResponse }> = ({ data }) => {
  const s = data.summary ?? {};
  let cards: { label: string; value: React.ReactNode; sub?: string }[] = [];

  if (data.reportType === "Case Status Report") {
    cards = [
      { label: 'Total Cases Registered', value: s.totalCases ?? 0 },
      { label: 'Active in Pipeline', value: s.activeCases ?? 0 },
      { label: 'Payment Completed', value: s.paymentCompletedCases ?? 0 },
      { label: 'Case Closed', value: s.closedCases ?? 0 },
      { label: 'Avg Lifecycle Duration', value: s.averageAgingDays ?? '0 days' },
    ];
  } else if (data.reportType === "Payment Report") {
    const details = data.details || [];
    const parseAmt = (val: any): number => {
      if (typeof val === "number") return val;
      const clean = String(val || "").replace(/[^0-9.-]+/g, "");
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Dynamically calculate sum of 'Disbursement' values for all rows where Clearance Status is 'Pending Clearance'
    const pendingClearanceRows = details.filter((d: any) => {
      const cs = String(d.clearanceStatus || "").toLowerCase();
      const ref = String(d.bankReference || "").toLowerCase();
      const st = String(d.status || "").toUpperCase();
      return cs === "pending clearance" || ref.includes("pending") || (!st.includes("PAID") && !st.includes("SUCCEED"));
    });
    const dynamicUndisbursedNum = pendingClearanceRows.reduce((sum: number, d: any) => sum + parseAmt(d.amount), 0);

    const settledRows = details.filter((d: any) => {
      const cs = String(d.clearanceStatus || "").toLowerCase();
      const st = String(d.status || "").toUpperCase();
      return cs === "cleared" || st === "PAID" || st === "TRANSFER_SUCCEED";
    });
    const dynamicDisbursedNum = settledRows.reduce((sum: number, d: any) => sum + parseAmt(d.amount), 0);
    const dynamicTotalVolNum = dynamicDisbursedNum + dynamicUndisbursedNum;
    const dynamicRate = dynamicTotalVolNum > 0 ? Math.round((dynamicDisbursedNum / dynamicTotalVolNum) * 100) : 0;

    const totalVolStr = dynamicTotalVolNum > 0
      ? `RM ${dynamicTotalVolNum.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : (s.totalPaymentVolume ?? "RM 0.00");
    const disbursedStr = dynamicDisbursedNum > 0
      ? `RM ${dynamicDisbursedNum.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : (s.totalDisbursement ?? "RM 0.00");
    const undisbursedStr = dynamicUndisbursedNum > 0
      ? `RM ${dynamicUndisbursedNum.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : (s.undisbursedAmount ?? "RM 0.00");

    cards = [
      { label: 'Total Volume', value: totalVolStr, sub: 'Pipeline Allocation' },
      { label: 'Total Disbursed', value: disbursedStr, sub: 'Cleared to Beneficiary' },
      { label: 'Undisbursed Amount', value: undisbursedStr, sub: 'Pending Clearance' },
      { label: 'Disbursement Rate', value: `${dynamicRate}%`, sub: 'Disbursed / Pipeline' },
      { label: 'Settled Records', value: `${settledRows.length} Paid`, sub: `${pendingClearanceRows.length} Pending Clearance` },
    ];
  } else {
    const totalRecs = Number(s.totalRecords ?? (data.details?.length ?? 0));
    const publishedRecs = Number(s.publishedRecords ?? (data.details?.filter((r: any) => String(r.status).toUpperCase() === 'PUBLISHED').length ?? 0));
    const dynamicCryptoPercentage = totalRecs > 0 ? `${Math.round((publishedRecs / totalRecs) * 100)}%` : '0%';
    const dynamicCryptoRatio = `${publishedRecs}/${totalRecs} Notarized`;

    cards = [
      { label: 'Total Ledger Records', value: totalRecs },
      { label: 'Published On-Chain', value: publishedRecs },
      { label: 'Ready to Publish', value: s.readyToPublishRecords ?? (totalRecs - publishedRecs) },
      {
        label: 'Cryptographic Proof',
        value: dynamicCryptoPercentage,
        sub: dynamicCryptoRatio,
      },
    ];
  }

  const gridClass = cards.length === 5
    ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4"
    : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4";

  return (
    <div className={gridClass}>
      {cards.map((c) => (
        <div key={c.label} className="bg-md-surface-container rounded-xl p-5 shadow-sm">
          <div className="text-[13px] font-medium text-md-on-surface-variant tracking-wide">{c.label}</div>
          <div className="text-2xl font-bold mt-1 tracking-tight">{c.value}</div>
          {c.sub && <div className="text-xs text-md-on-surface-variant mt-1 font-medium">{c.sub}</div>}
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────── Record preview table ─────────────────────── */

/* Preferred column order per report type, so every preview lines up with the
   dashboard tables that use the same design-system tokens. */
const PREFERRED_COLUMNS: Record<string, string[]> = {
  'Case Status Report': ['caseId', 'title', 'state', 'district', 'status', 'date', 'lifecycleAging'],
  'Payment Report': ['caseId', 'payeeName', 'bankName', 'amount', 'bankReference', 'status', 'date'],
  'Blockchain Audit Report': ['caseId', 'milestone', 'transactionHash', 'documentHash', 'status', 'publishedAt'],
};

const COLUMN_LABELS: Record<string, string> = {
  caseId: 'Case Ref',
  title: 'Case Title',
  state: 'State',
  district: 'District',
  status: 'Status',
  date: 'Date',
  lifecycleAging: 'Lifecycle Aging',
  payeeName: 'Payee',
  bankName: 'Bank Name',
  amount: 'Amount',
  bankReference: 'Bank Reference',
  milestone: 'Milestone',
  transactionHash: 'Transaction Hash',
  documentHash: 'Document Hash',
  publishedAt: 'Published Date',
};

/* Sized to comfortably fit badges and text without overflowing columns or wrapping headers */
const COLUMN_WIDTHS: Record<string, string> = {
  caseId: '150px',
  title: '220px',
  state: '130px',
  district: '120px',
  status: '220px',
  date: '110px',
  lifecycleAging: '110px',
  payeeName: '180px',
  bankName: '130px',
  amount: '140px',
  bankReference: '150px',
  milestone: '90px',
  transactionHash: '200px',
  documentHash: '200px',
  publishedAt: '120px',
};

const columnLabel = (key: string) =>
  COLUMN_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

const PREVIEW_PAGE_SIZE = 10;

/* Identifier/reference columns get a copy-to-clipboard button, matching the
   Payment and Compensation tables. */
const COPYABLE_COLUMNS = new Set(['caseId', 'transactionHash', 'documentHash', 'bankReference']);

/* Renders every record through the shared dashboard table component — the same
   .table-wrap / .table-scroll structure, sortable headers and footer pagination
   the Payment and Compensation tables use. */
export const ReportDataTable: React.FC<{ data: ReportGeneratedResponse }> = ({ data }) => {
  const rows: Record<string, any>[] = data.details ?? [];
  const [currentPage, setCurrentPage] = React.useState(1);
  const { sortKey, sortDirection, handleSort, renderSortIcon, sortItems } = useTableSort<string>();

  const columns = React.useMemo(() => {
    if (rows.length === 0) return [] as string[];
    const present = new Set(Object.keys(rows[0]));
    const preferred = (PREFERRED_COLUMNS[data.reportType] ?? []).filter((k) => present.has(k));
    const remaining = Object.keys(rows[0]).filter((k) => !preferred.includes(k));
    return [...preferred, ...remaining];
  }, [rows, data.reportType]);

  const sortedRows = React.useMemo(
    () => sortItems(rows),
    [rows, sortKey, sortDirection, sortItems]
  );

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PREVIEW_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageRows = sortedRows.slice((safePage - 1) * PREVIEW_PAGE_SIZE, safePage * PREVIEW_PAGE_SIZE);

  return (
    <div className="table-wrap">
      <div className="table-scroll overflow-x-auto">
        <table className="w-full text-left border-collapse" style={{ minWidth: '980px' }}>
          <thead>
            <tr>
              {columns.map((key) => (
                <th
                  key={key}
                  style={{ width: COLUMN_WIDTHS[key], minWidth: COLUMN_WIDTHS[key] }}
                  onClick={() => handleSort(key)}
                  className="cursor-pointer select-none px-3.5 py-3 text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider"
                >
                  <div className="flex items-center gap-1">
                    <span>{columnLabel(key)}</span>
                    {renderSortIcon(key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 || columns.length === 0 ? (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} className="text-center py-8 text-md-on-surface-variant">
                  <AlertCircle size={24} className="mx-auto mb-2 opacity-50" />
                  No preview records found. Adjust your filters.
                </td>
              </tr>
            ) : (
              pageRows.map((row, idx) => (
                <tr key={idx} className="border-b border-md-outline-variant/30 hover:bg-md-surface-container-high/40 transition-colors">
                  {columns.map((key) => {
                    const value = row[key];
                    if (key.toLowerCase() === 'status') {
                      return (
                        <td key={key} className="px-3.5 py-3 whitespace-nowrap" style={{ width: COLUMN_WIDTHS[key], minWidth: COLUMN_WIDTHS[key] }}>
                          <StatusBadge status={String(value)} />
                        </td>
                      );
                    }
                    const text = String(value ?? '-');
                    const isHash = key.toLowerCase().includes('hash') || text.startsWith('0x');
                    const isTxHash = key === 'transactionHash' && text && text !== '-' && text.startsWith('0x');
                    return (
                      <td key={key} className="px-3.5 py-3 text-sm text-md-on-surface" style={{ width: COLUMN_WIDTHS[key], minWidth: COLUMN_WIDTHS[key] }}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isTxHash ? (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${text}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs text-md-primary hover:underline inline-flex items-center gap-1 break-all group"
                              title="View on Sepolia Etherscan"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>{text}</span>
                              <ExternalLink size={12} className="shrink-0 opacity-70 group-hover:opacity-100" />
                            </a>
                          ) : (
                            <span
                              className={isHash ? 'font-mono text-xs break-all' : 'truncate'}
                              title={text}
                            >
                              {text}
                            </span>
                          )}
                          {COPYABLE_COLUMNS.has(key) && (
                            <CopyButton value={text} title={`Copy ${columnLabel(key)}`} />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        totalCount={sortedRows.length}
        pageSize={PREVIEW_PAGE_SIZE}
        onPageChange={setCurrentPage}
        itemLabel="records"
      />
    </div>
  );
};