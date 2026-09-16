import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Pagination } from '../../components/ui/Pagination';
import type { ReportGeneratedResponse } from '../../services/reportApi';
import { reportStatusLabel } from './reportConstants';

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
    <span className={`inline-flex items-center gap-1.5 rounded-full py-0.5 pl-2 pr-3 text-xs font-semibold ${style.bg} ${style.fg}`}>
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
      { label: 'Total Cases Found', value: s.totalCases ?? 0 },
      { label: 'Active Acquisition', value: s.activeCases ?? 0 },
      { label: 'Completed / Closed', value: s.completedCases ?? 0 },
      { label: 'Average Lifecycle Aging', value: s.averageAgingDays ?? '0 days' },
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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

const columnLabel = (key: string) =>
  COLUMN_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

/* Records per page in the preview tables — matches the dashboard tables so the
   footer pagination reads the same everywhere. */
const PREVIEW_PAGE_SIZE = 10;

/* Renders every record with design-system styling — status columns get a
   coloured pill badge, hash/address values keep their full length in monospace,
   and the footer paginates the list the same way the dashboard tables do. */
export const ReportDataTable: React.FC<{ data: ReportGeneratedResponse }> = ({ data }) => {
  const rows: Record<string, any>[] = data.details ?? [];
  const [currentPage, setCurrentPage] = React.useState(1);

  const columns = React.useMemo(() => {
    if (rows.length === 0) return [] as string[];
    const present = new Set(Object.keys(rows[0]));
    const preferred = (PREFERRED_COLUMNS[data.reportType] ?? []).filter((k) => present.has(k));
    const remaining = Object.keys(rows[0]).filter((k) => !preferred.includes(k));
    return [...preferred, ...remaining];
  }, [rows, data.reportType]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PREVIEW_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageRows = rows.slice((safePage - 1) * PREVIEW_PAGE_SIZE, safePage * PREVIEW_PAGE_SIZE);

  return (
    <div className="bg-md-surface-container rounded-xl shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {columns.map((key) => (
                <th
                  key={key}
                  className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant whitespace-nowrap"
                >
                  {columnLabel(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 || columns.length === 0 ? (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} className="px-4 py-8 text-center text-md-on-surface-variant">
                  <AlertCircle size={24} className="mx-auto mb-2 opacity-50" />
                  No preview records found. Adjust your filters.
                </td>
              </tr>
            ) : (
              pageRows.map((row, idx) => (
                <tr key={idx} className="border-t border-md-outline/10 hover:bg-md-primary/5 transition-colors">
                  {columns.map((key) => {
                    const value = row[key];
                    if (key.toLowerCase() === 'status') {
                      return (
                        <td key={key} className="px-4 py-3">
                          <StatusBadge status={String(value)} />
                        </td>
                      );
                    }
                    const text = String(value ?? '-');
                    const isHash = key.toLowerCase().includes('hash') || text.startsWith('0x');
                    return (
                      <td key={key} className="px-4 py-3 text-md-on-surface-variant">
                        {isHash ? <span className="font-mono text-xs break-all">{text}</span> : text}
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
        totalCount={rows.length}
        pageSize={PREVIEW_PAGE_SIZE}
        onPageChange={setCurrentPage}
        itemLabel="records"
      />
    </div>
  );
};
