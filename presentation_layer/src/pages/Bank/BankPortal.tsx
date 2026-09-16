import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  FileCheck,
  FileX,
  Landmark,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { paymentApi } from '../../services/paymentApi';
import { useNotification } from '../../components/ui/NotificationSystem';
import { Button } from '../../components/ui/Button';
import { CopyButton } from '../../components/ui/CopyButton';
import { CaseIdCell } from '../../components/admin/CaseIdCell';
import { SearchInput } from '../../components/ui/SearchInput';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import type { SelectOption } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Pagination } from '../../components/ui/Pagination';
import {
  ViewDetailsModal,
  paymentBadge,
  fmtAmount,
  fmtDate,
  maskAccount,
} from '../Payment/paymentModals';
import { CaseDetailsModal } from '../Payment/CaseDetailsModal';
import { normalizePaymentStatus } from '../Payment/statusMaps';
import { RefreshButton } from '../Payment/RefreshButton';
import type { PaymentRow } from '../Payment/paymentModals';
import '../LandAcquisition/case_management.css';
import '../Payment/payment.css';

export const CATEGORY_A_REASONS: SelectOption[] = [
  { value: 'RECIPIENT_ACCOUNT_INVALID_OR_NOT_FOUND', label: 'Recipient account number not found or routing code invalid' },
  { value: 'RECIPIENT_ACCOUNT_CLOSED_OR_FROZEN', label: 'Recipient bank account is dormant, frozen, or closed' },
  { value: 'NAME_MISMATCH_OUTDATED_DETAILS', label: 'Beneficiary name does not match bank account records' },
];

export const CATEGORY_B_REASONS: SelectOption[] = [
  { value: 'INTERBANK_SWITCH_GATEWAY_TIMEOUT', label: 'Interbank switch gateway communication timeout' },
  { value: 'DAILY_CLEARING_QUOTA_EXCEEDED', label: 'Daily interbank clearing quota exceeded by receiving bank' },
  { value: 'PROCESSING_PIPELINE_SYSTEM_ERROR', label: 'Internal bank processing anomaly during settlement execution' },
];

const FAILURE_REASONS: SelectOption[] = [
  ...CATEGORY_A_REASONS.map((r) => ({ ...r, label: `[Category A: Transfer Rejected] ${r.label}` })),
  ...CATEGORY_B_REASONS.map((r) => ({ ...r, label: `[Category B: Transfer Failed] ${r.label}` })),
];

const FAILURE_SOLUTIONS: Record<string, string> = {
  RECIPIENT_ACCOUNT_INVALID_OR_NOT_FOUND: 'Permitted Resolution: Request New Bank Details (Member must input new bank details)',
  RECIPIENT_ACCOUNT_CLOSED_OR_FROZEN: 'Permitted Resolution: Request New Bank Details (Member must input new bank details)',
  NAME_MISMATCH_OUTDATED_DETAILS: 'Permitted Resolution: Request New Bank Details (Member must input new bank details)',
  INTERBANK_SWITCH_GATEWAY_TIMEOUT: 'Permitted Resolutions: Schedule Tomorrow or Request New Bank Details',
  DAILY_CLEARING_QUOTA_EXCEEDED: 'Permitted Resolutions: Schedule Tomorrow or Request New Bank Details',
  PROCESSING_PIPELINE_SYSTEM_ERROR: 'Permitted Resolutions: Schedule Tomorrow or Request New Bank Details',
};
const ITEMS_PER_PAGE = 10;

export default function BankPortal() {
  const [pendingCases, setPendingCases] = useState<PaymentRow[]>([]);
  const [historyCases, setHistoryCases] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const [pendingPage, setPendingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const [rejectModalCase, setRejectModalCase] = useState<PaymentRow | null>(null);
  const [detailModalCase, setDetailModalCase] = useState<PaymentRow | null>(null);
  const [caseDetailsId, setCaseDetailsId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState(FAILURE_REASONS[0].value);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { notify } = useNotification();
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.bank-topbar', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' });
    gsap.fromTo(
      '.stat-card',
      { opacity: 0, y: 24, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.08, ease: 'back.out(1.3)', delay: 0.15 }
    );
    gsap.fromTo(
      '.portal-content-wrap',
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', delay: 0.35 }
    );
  }, { scope: containerRef });

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [pendingRes, historyRes] = await Promise.all([
        paymentApi.getBankPending().catch(() => ({ cases: [] })),
        paymentApi.getBankHistory().catch(() => ({ cases: [] })),
      ]);
      setPendingCases(pendingRes.cases || []);
      setHistoryCases(historyRes.cases || []);
    } catch (e: any) {
      notify({
        type: 'error',
        title: 'Failed to load Bank Gateway',
        message: e.message || 'Could not fetch bank cases.',
      });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll the queue so transfers that reach Waiting Bank Approval (admin-side
  // 5s auto-submission) appear here without a manual refresh.
  useEffect(() => {
    const timer = setInterval(() => loadData(true), 5000);
    return () => clearInterval(timer);
  }, [loadData]);

  const handleApprove = async (pc: PaymentRow) => {
    setProcessingId(pc.caseId);
    try {
      const bankRef = `BNK-${Date.now().toString().slice(-6)}-${pc.caseId.replace(/[^A-Za-z0-9]/g, '')}`;
      await paymentApi.approveBank({ caseId: pc.caseId, bankReferenceNumber: bankRef });
      notify({
        type: 'success',
        title: 'Payment Disbursed (Paid)',
        message: `Case ${pc.caseId} cleared successfully! Ref: ${bankRef}`,
      });
      loadData();
    } catch (e: any) {
      notify({
        type: 'error',
        title: 'Clearance Failed',
        message: e.message || 'Could not approve transfer.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalCase) return;
    const isCatA = CATEGORY_A_REASONS.some((r) => r.value === selectedReason);
    const rawLabel = [...CATEGORY_A_REASONS, ...CATEGORY_B_REASONS].find((r) => r.value === selectedReason)?.label || selectedReason;
    const finalReason = `${selectedReason}: ${rawLabel}`;

    setProcessingId(rejectModalCase.caseId);
    try {
      await paymentApi.rejectBank({
        caseId: rejectModalCase.caseId,
        errorReason: finalReason,
        isRejectedCategory: isCatA,
      });
      notify({
        type: 'general',
        title: isCatA ? 'Transfer Failed (Category 1)' : 'Transfer Failed (Category 2)',
        message: `Case ${rejectModalCase.caseId} marked Transfer Failed (${isCatA ? 'Category 1: Recipient Account Issue' : 'Category 2: Bank / Gateway Issue'}). Logged in Failed Transactions queue.`,
      });
      setRejectModalCase(null);
      loadData();
    } catch (err: unknown) {
      const e = err as Error;
      notify({
        type: 'error',
        title: 'Rejection Failed',
        message: e.message || 'Could not reject transfer.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredPending = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return pendingCases.filter(
      (c) =>
        !q ||
        c.caseId.toLowerCase().includes(q) ||
        (c.accountHolderName ?? '').toLowerCase().includes(q) ||
        (c.bankName ?? '').toLowerCase().includes(q)
    );
  }, [pendingCases, searchQuery]);

  const filteredHistory = useMemo(() => {
    const q = historySearchQuery.trim().toLowerCase();
    return historyCases.filter(
      (c) =>
        !q ||
        c.caseId.toLowerCase().includes(q) ||
        (c.accountHolderName ?? '').toLowerCase().includes(q) ||
        (c.bankName ?? '').toLowerCase().includes(q) ||
        (c.receipt?.bankReferenceNumber ?? '').toLowerCase().includes(q)
    );
  }, [historyCases, historySearchQuery]);

  const totalPendingPages = Math.max(1, Math.ceil(filteredPending.length / ITEMS_PER_PAGE));
  const safePendingPage = Math.min(pendingPage, totalPendingPages);
  const pagedPendingRows = filteredPending.slice(
    (safePendingPage - 1) * ITEMS_PER_PAGE,
    safePendingPage * ITEMS_PER_PAGE
  );

  const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / ITEMS_PER_PAGE));
  const safeHistoryPage = Math.min(historyPage, totalHistoryPages);
  const pagedHistoryRows = filteredHistory.slice(
    (safeHistoryPage - 1) * ITEMS_PER_PAGE,
    safeHistoryPage * ITEMS_PER_PAGE
  );

  const stats = [
    {
      label: 'RENTAS Queue (Pending Clearing)',
      value: pendingCases.length,
      change: 'Awaiting gross RTGS settlement',
      icon: Clock,
      colorClass: 'text-amber-500',
    },
    {
      label: 'Settled Gross RTGS (Paid)',
      value: historyCases.filter((c) => normalizePaymentStatus(c.status) === 'Paid').length,
      change: 'Settled with RENTAS receipt',
      icon: FileCheck,
      colorClass: 'text-emerald-500',
    },
    {
      label: 'RENTAS Clearing Exceptions',
      value: historyCases.filter((c) => normalizePaymentStatus(c.status) === 'Transfer Failed').length,
      change: 'Logged for retry & resolution',
      icon: FileX,
      colorClass: 'text-rose-500',
    },
  ];

  return (
    <div className="main min-h-screen bg-md-background text-md-on-surface px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-10" ref={containerRef}>
      {/* Topbar adhering to DESIGN.md standard */}
      <div className="topbar bank-topbar">
        <div className="topbar-left">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0f172a] text-[#fbbf24] border border-[#fbbf24]/30 flex items-center justify-center font-bold shadow-md">
              <Landmark size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">RENTAS Host Gateway</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-[#0f172a] text-[#fbbf24] border border-[#fbbf24]/40 uppercase">
                  Bank Negara Malaysia RTGS
                </span>
                <span className="payment-badge status-paid" style={{ fontSize: '11px', padding: '2px 10px' }}>
                  <span className="dot" /> LIVE TERMINAL
                </span>
              </div>
              <div className="sub mt-0.5">
                Real-time Electronic Transfer of Funds and Securities · High-Value Interbank Settlement Network.
              </div>
            </div>
          </div>
        </div>

        <div className="topbar-right flex items-center gap-2.5">
          <RefreshButton onClick={() => loadData()} loading={loading} label="Refresh Queue" />
          <Link to="/admin/payment">
            <Button variant="outlined" size="sm" className="inline-flex items-center gap-1.5">
              <span>Admin Payments</span>
              <ExternalLink size={13} />
            </Button>
          </Link>
          <Link to="/admin/blockchain">
            <Button variant="filled" size="sm" className="inline-flex items-center gap-1.5">
              <span>Blockchain Ledger</span>
              <ArrowRight size={13} />
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="stats-grid">
        {stats.map((stat, idx) => (
          <div key={idx} className="stat-card">
            <stat.icon className={`stat-icon ${stat.colorClass}`} size={32} />
            <div className="stat-label">{stat.label}</div>
            <div className="stat-number">{stat.value}</div>
            <div className="stat-change">{stat.change}</div>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="portal-content-wrap space-y-6">
        <div className="flex items-center gap-2 border-b border-md-outline/10 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-md-primary text-md-on-primary shadow-sm'
                : 'bg-md-surface-container hover:bg-md-surface-container-low text-md-on-surface-variant'
            }`}
          >
            <ShieldCheck size={16} />
            <span>RENTAS Clearing Queue</span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full ${
                activeTab === 'pending'
                  ? 'bg-white/20 text-white'
                  : 'bg-md-surface-container-low text-md-on-surface-variant'
              }`}
            >
              {pendingCases.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-md-primary text-md-on-primary shadow-sm'
                : 'bg-md-surface-container hover:bg-md-surface-container-low text-md-on-surface-variant'
            }`}
          >
            <Clock size={16} />
            <span>RENTAS Settlement History &amp; Logs</span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full ${
                activeTab === 'history'
                  ? 'bg-white/20 text-white'
                  : 'bg-md-surface-container-low text-md-on-surface-variant'
              }`}
            >
              {historyCases.length}
            </span>
          </button>
        </div>

        {/* TAB 1: PENDING CLEARING QUEUE */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            <div className="filter-bar">
              <SearchInput
                placeholder="Search case ID, beneficiary, or bank..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPendingPage(1);
                }}
              />
              <div className="filter-group">
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setPendingPage(1);
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="action-bar">
              <div className="left">
                <span className="count">
                  {filteredPending.length} transfer{filteredPending.length === 1 ? '' : 's'} awaiting RENTAS gross clearance
                </span>
              </div>
            </div>

            <div className="table-wrap">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Payment ID</th>
                      <th>Case ID</th>
                      <th>Beneficiary</th>
                      <th>Bank &amp; Account</th>
                      <th>Amount</th>
                      <th>Signatures</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="text-center text-md-on-surface-variant py-8">
                          <RefreshCw size={22} className="inline animate-spin mr-2 text-md-primary" />
                          <span>Connecting to Bank Negara Malaysia RENTAS Gateway…</span>
                        </td>
                      </tr>
                    ) : pagedPendingRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center text-md-on-surface-variant py-8">
                          {searchQuery
                            ? 'No pending transfers match your search.'
                            : 'No authorised payments waiting for bank clearance right now.'}
                          <div className="text-xs text-md-on-surface-variant/70 mt-1">
                            Transfers that complete required multi-signatures in{' '}
                            <Link to="/admin/payment/pending" className="text-md-primary underline">
                              Pending Authorisations
                            </Link>{' '}
                            will appear here for settlement.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      pagedPendingRows.map((pc) => {
                        const paymentId = pc.paymentId || `PMT-${pc.caseId}`;
                        const isProcessing = processingId === pc.caseId;
                        return (
                          <tr key={pc.caseId} className="row-clickable" onClick={() => setDetailModalCase(pc)}>
                            <td>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-xs text-md-primary">{paymentId}</span>
                                <CopyButton value={paymentId} title="Copy Payment ID" />
                              </div>
                            </td>
                            <td>
                              <CaseIdCell caseId={pc.caseId} onClick={(cid) => setCaseDetailsId(cid)} />
                            </td>
                            <td>{pc.accountHolderName || pc.beneficiaryId || '—'}</td>
                            <td>
                              <div>{pc.bankName || 'Maybank'}</div>
                              <div className="flex items-center gap-1.5 text-xs font-mono text-md-on-surface-variant">
                                <span>{maskAccount(pc.accountNumber)}</span>
                                {pc.accountNumber && <CopyButton value={pc.accountNumber} title="Copy Account Number" />}
                              </div>
                            </td>
                            <td className="font-semibold">{fmtAmount(pc.amount)}</td>
                            <td>
                              <span className="meta-text">
                                {pc.currentSignatures}/{pc.requiredSignatures || 1} met
                              </span>
                            </td>
                            <td>{paymentBadge(pc.status, pc.currentSignatures, pc.requiredSignatures)}</td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div className="row-actions">
                                <Button
                                  size="sm"
                                  variant="filled"
                                  disabled={isProcessing}
                                  onClick={() => handleApprove(pc)}
                                  className="h-8 px-3 text-xs inline-flex items-center gap-2 rounded-full font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                >
                                  <CheckCircle2 size={13} className="shrink-0" />
                                  <span>Approve Payout</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  disabled={isProcessing}
                                  onClick={() => {
                                    setRejectModalCase(pc);
                                    setSelectedReason(FAILURE_REASONS[0].value);
                                  }}
                                  className="h-8 px-3 text-xs inline-flex items-center gap-2 rounded-full font-medium shadow-sm"
                                >
                                  <XCircle size={13} className="shrink-0" />
                                  <span>Reject</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {filteredPending.length > ITEMS_PER_PAGE && (
                <Pagination
                  currentPage={safePendingPage}
                  totalPages={totalPendingPages}
                  onPageChange={setPendingPage}
                  totalCount={filteredPending.length}
                  pageSize={ITEMS_PER_PAGE}
                  itemLabel="clearance transfers"
                />
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CLEARANCE HISTORY & AUDIT LOGS */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="filter-bar">
              <SearchInput
                placeholder="Search case ID, beneficiary, bank, or receipt reference..."
                value={historySearchQuery}
                onChange={(e) => {
                  setHistorySearchQuery(e.target.value);
                  setHistoryPage(1);
                }}
              />
              <div className="filter-group">
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => {
                    setHistorySearchQuery('');
                    setHistoryPage(1);
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="action-bar">
              <div className="left">
                <span className="count">
                  {filteredHistory.length} cleared or rejected RENTAS RTGS record{filteredHistory.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <div className="table-wrap">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th className="whitespace-nowrap">Payment ID</th>
                      <th className="whitespace-nowrap">Case ID</th>
                      <th>Beneficiary</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th className="whitespace-nowrap px-4">Bank Reference / Clearing Failure</th>
                      <th className="whitespace-nowrap px-4">Settlement Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedHistoryRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center text-md-on-surface-variant py-8">
                          No clearance history records found.
                        </td>
                      </tr>
                    ) : (
                      pagedHistoryRows.map((c) => {
                        const isCleared =
                          normalizePaymentStatus(c.status) === 'Transfer Succeed' ||
                          normalizePaymentStatus(c.status) === 'Paid' ||
                          c.status === 'TRANSFER_SUCCEED' ||
                          c.status === 'PAID' ||
                          Boolean(c.receipt);
                        const isFailed =
                          normalizePaymentStatus(c.status) === 'Transfer Failed' ||
                          c.status === 'TRANSFER_FAILED';
                        const latestFail = c.failedTransactions?.[c.failedTransactions.length - 1];
                        const paymentId = c.paymentId || `PMT-${c.caseId}`;
                        return (
                          <tr key={c.caseId} className="row-clickable" onClick={() => setDetailModalCase(c)}>
                            <td>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-xs text-md-primary">{paymentId}</span>
                                <CopyButton value={paymentId} title="Copy Payment ID" />
                              </div>
                            </td>
                            <td>
                              <CaseIdCell caseId={c.caseId} onClick={(cid) => setCaseDetailsId(cid)} />
                            </td>
                            <td>{c.accountHolderName || c.beneficiaryId || '—'}</td>
                            <td className="font-semibold">{fmtAmount(c.amount)}</td>
                            <td>{paymentBadge(c.status, c.currentSignatures, c.requiredSignatures)}</td>
                            <td className="px-4">
                              {isCleared ? (
                                <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                  <span>{c.receipt?.bankReferenceNumber || 'RENTAS-BNM-CLEARED'}</span>
                                  <CopyButton value={c.receipt?.bankReferenceNumber || 'RENTAS-BNM-CLEARED'} title="Copy RENTAS Reference Number" />
                                </div>
                              ) : isFailed ? (
                                <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                                  {latestFail?.errorLog || 'Bank clearance declined by commercial gateway'}
                                </span>
                              ) : (
                                <span className="text-xs text-md-on-surface-variant font-mono">—</span>
                              )}
                            </td>
                            <td className="px-4 whitespace-nowrap">
                              <span className="meta-text font-mono text-xs">{fmtDate(c.updatedAt || c.createdAt)}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {filteredHistory.length > ITEMS_PER_PAGE && (
                <Pagination
                  currentPage={safeHistoryPage}
                  totalPages={totalHistoryPages}
                  onPageChange={setHistoryPage}
                  totalCount={filteredHistory.length}
                  pageSize={ITEMS_PER_PAGE}
                  itemLabel="clearance records"
                />
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ height: '32px' }} />

      {/* Reject Simulation Modal adhering to DESIGN.md §4 */}
      <Modal
        isOpen={Boolean(rejectModalCase)}
        onClose={() => setRejectModalCase(null)}
        title="Simulate Bank Transfer Rejection"
        subtitle={rejectModalCase ? `Case ${rejectModalCase.caseId} · ${fmtAmount(rejectModalCase.amount)}` : ''}
        cancelText="Cancel"
        confirmText="Confirm Bank Rejection"
        confirmVariant="danger"
        confirmLoading={processingId === rejectModalCase?.caseId}
        onConfirm={handleRejectConfirm}
        maxWidth="max-w-lg"
      >
        {rejectModalCase && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-md-error/10 border border-md-error/20 text-md-on-error text-xs">
              <div className="font-bold mb-1 flex items-center gap-1.5">
                <AlertTriangle size={15} /> Rejecting Payout Clearance for {rejectModalCase.caseId}
              </div>
              Select a locked failure reason code below. Category A issues mark the payment as{' '}
              <strong>Transfer Rejected</strong> (requiring new bank details), while Category B network issues mark it as{' '}
              <strong>Transfer Failed</strong> (unlocking reschedule or new details).
            </div>

            <div className="space-y-2">
              <Select
                label="Rejection / Failure Code"
                options={FAILURE_REASONS}
                value={selectedReason}
                onChange={setSelectedReason}
                placeholder="Select bank rejection reason"
                wrapLabels
              />
              {FAILURE_SOLUTIONS[selectedReason] && (
                <div className="text-xs bg-md-surface-container-highest rounded-lg px-3 py-2 text-md-on-surface-variant flex items-center gap-1.5 font-medium">
                  <span className="text-md-primary font-bold">Standard SOP:</span>
                  <span>{FAILURE_SOLUTIONS[selectedReason]}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Full Details Modal */}
      <ViewDetailsModal pc={detailModalCase} onClose={() => setDetailModalCase(null)} />
      <CaseDetailsModal caseId={caseDetailsId} onClose={() => setCaseDetailsId(null)} />
    </div>
  );
}
