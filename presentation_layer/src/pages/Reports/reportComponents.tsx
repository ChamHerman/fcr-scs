import React from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Pagination } from '../../components/ui/Pagination';
import { CopyButton } from '../../components/ui/CopyButton';
import { useTableSort } from '../../constants';
import type { ReportGeneratedResponse } from '../../services/reportApi';
import { reportStatusLabel } from './reportConstants';
import '../LandAcquisition/case_management.css';

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
  const style = statusStyle(status);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full py-0.5 pl-2 pr-3 text-xs font-semibold whitespace-nowrap ${style.bg} ${style.fg}`}>
      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
      {reportStatusLabel(status)}
    </span>
  );
};

/* ─────────────────────────── Summary KPI cards ─────────────────────────── */

export const ReportSummaryCards: React.FC<{ data: ReportGeneratedResponse }> = ({ data }) => {
  const s = data.summary ?? {};
  let cards: { label: string; value: React.ReactNode }[] = [];

  if (data.reportType === "Case Status Report") {
    cards = [
      { label: 'Total Cases Registered', value: s.totalCases ?? 0 },
      { label: 'Active in Pipeline', value: s.activeCases ?? 0 },
      { label: 'Payment Completed', value: s.paymentCompletedCases ?? 0 },
      { label: 'Case Closed', value: s.closedCases ?? 0 },
      { label: 'Avg Lifecycle Duration', value: s.averageAgingDays ?? '0 days' },
    ];
  } else if (data.reportType === "Payment Report") {
    cards = [
      { label: 'Total Disbursements', value: s.totalDisbursement ?? 'RM 0.00' },
      { label: 'Success Rate', value: s.successRate ?? '0%' },
      { label: 'Paid Records', value: s.successfulPayments ?? 0 },
      { label: 'Pending / Processing', value: s.pendingPayments ?? 0 },
    ];
  } else {
    cards = [
      { label: 'Total Ledger Records', value: s.totalRecords ?? 0 },
      { label: 'Published On-Chain', value: s.publishedRecords ?? 0 },
      { label: 'Ready to Publish', value: s.readyToPublishRecords ?? 0 },
      { label: 'Cryptographic Integrity', value: s.integrityStatus ?? 'Verified' },
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

/* Explicit widths because the shared table CSS uses table-layout: fixed. Each
   report's column set is sized to fit the preview modal without side-scrolling. */
const COLUMN_WIDTHS: Record<string, string> = {
  caseId: '120px',
  title: '200px',
  state: '110px',
  district: '110px',
  status: '170px',
  date: '100px',
  lifecycleAging: '100px',
  payeeName: '160px',
  bankName: '120px',
  amount: '130px',
  bankReference: '140px',
  milestone: '90px',
  transactionHash: '190px',
  documentHash: '190px',
  publishedAt: '110px',
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
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((key) => (
                <th
                  key={key}
                  style={{ width: COLUMN_WIDTHS[key] }}
                  onClick={() => handleSort(key)}
                  className="cursor-pointer select-none"
                >
                  {columnLabel(key)} {renderSortIcon(key)}
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
                <tr key={idx}>
                  {columns.map((key) => {
                    const value = row[key];
                    if (key.toLowerCase() === 'status') {
                      return (
                        <td key={key}>
                          <StatusBadge status={String(value)} />
                        </td>
                      );
                    }
                    const text = String(value ?? '-');
                    const isHash = key.toLowerCase().includes('hash') || text.startsWith('0x');
                    const isTxHash = key === 'transactionHash' && text && text !== '-' && text.startsWith('0x');
                    return (
                      <td key={key}>
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