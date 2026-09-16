import React from 'react';
import { AlertCircle } from 'lucide-react';
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

/* Renders the details rows with design-system styling: the status column gets a
   colored pill badge, long hashes/addresses are truncated. */
export const ReportDataTable: React.FC<{ data: ReportGeneratedResponse }> = ({ data }) => {
  return (
    <div className="bg-md-surface-container rounded-xl shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {data.details && data.details.length > 0 ? (
              Object.keys(data.details[0]).map((key) => (
                <th key={key} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant whitespace-nowrap">
                  {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
                </th>
              ))
            ) : (
              <>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Case ID</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Date</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {data.details && data.details.length > 0 ? (
            data.details.slice(0, 25).map((row: Record<string, any>, idx) => (
              <tr key={idx} className="border-t border-md-outline/10 hover:bg-md-primary/5 transition-colors">
                {Object.entries(row).map(([key, val]) => (
                  <td key={key} className="px-4 py-3">
                    {key.toLowerCase() === 'status' ? (
                      <StatusBadge status={String(val)} />
                    ) : typeof val === 'string' && (val.startsWith('0x') || val.length > 30) ? (
                      <span className="font-medium font-mono text-xs text-md-on-surface-variant">{val.slice(0, 16)}...</span>
                    ) : (
                      <span className="text-md-on-surface-variant">{String(val ?? '-')}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-md-on-surface-variant">
                <AlertCircle size={24} className="mx-auto mb-2 opacity-50" />
                No preview records found. Adjust your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
