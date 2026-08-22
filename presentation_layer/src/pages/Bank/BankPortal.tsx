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
import { normalizePaymentStatus } from '../Payment/statusMaps';
import type { PaymentRow } from '../Payment/paymentModals';
import '../LandAcquisition/case_management.css';
import '../Payment/payment.css';

const FAILURE_REASONS: SelectOption[] = [
  { value: 'BENEFICIARY_NAME_MISMATCH', label: 'Beneficiary name does not match bank account records (Name Mismatch)' },
  { value: 'ACCOUNT_DORMANT_OR_FROZEN', label: 'Beneficiary bank account is dormant, frozen, or closed' },
  { value: 'INVALID_ROUTING_OR_SWIFT', label: 'Invalid bank branch routing code / SWIFT identifier' },
  { value: 'DAILY_CLEARING_LIMIT_EXCEEDED', label: 'Daily interbank clearing quota exceeded by receiving bank' },
  { value: 'AML_SANCTIONS_FLAG', label: 'Transaction flagged by AML / Sanctions automated screening' },
  { value: 'INSUFFICIENT_ESCROW_LIQUIDITY', label: 'Clearing account insufficient settlement liquidity balance' },
  { value: 'CUSTOM', label: 'Other Custom Failure Reason (specify below)' },
];

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
  const [selectedReason, setSelectedReason] = useState(FAILURE_REASONS[0].value);
  const [customReasonText, setCustomReasonText] = useState('');
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
    const finalReason =
      selectedReason === 'CUSTOM'
        ? customReasonText.trim() || 'Commercial bank settlement clearance declined'
        : FAILURE_REASONS.find((r) => r.value === selectedReason)?.label || selectedReason;

    setProcessingId(rejectModalCase.caseId);
    try {
      await paymentApi.rejectBank({
        caseId: rejectModalCase.caseId,
        errorReason: finalReason,
      });
      notify({
        type: 'general',
        title: 'Transfer Rejected by Bank',
        message: `Case ${rejectModalCase.caseId} marked Transfer Failed. Logged in Failed Transactions queue.`,
      });
      setRejectModalCase(null);
      setCustomReasonText('');
      loadData();
    } catch (e: any) {
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
      label: 'Awaiting Bank Approval',
      value: pendingCases.length,
      change: 'Submitted for bank approval',
      icon: Clock,
      colorClass: 'text-amber-500',
    },
    {
      label: 'Settled Payouts (Paid)',
      value: historyCases.filter((c) => normalizePaymentStatus(c.status) === 'Paid').length,
      change: 'Disbursed with bank receipt',
      icon: FileCheck,
      colorClass: 'text-emerald-500',
    },
    {
      label: 'Failed / Rejected Logs',
      value: historyCases.filter((c) => normalizePaymentStatus(c.status) === 'Transfer Failed').length,
      change: 'Logged for retry & resolution',
      icon: FileX,
      colorClass: 'text-rose-500',
    },
  ];

  return (
    <div className="main min-h-screen bg-md-background text-md-on-surface" ref={containerRef}>
      {/* Topbar adhering to DESIGN.md standard */}
      <div className="topbar bank-topbar">
        <div className="topbar-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-md-primary/10 border border-md-primary/20 flex items-center justify-center text-md-primary font-bold shadow-sm">
              <Landmark size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Interbank Clearing Gateway</h1>
                <span className="payment-badge status-paid" style={{ fontSize: '11px', padding: '2px 10px' }}>
                  <span className="dot" /> LIVE SIMULATION
                </span>
              </div>
              <div className="sub mt-0.5">
                External commercial banking network settlement engine · Simulates bank gateway payout approvals &amp; failure handling.
              </div>
            </div>
          </div>
        </div>

        <div className="topbar-right flex items-center gap-2.5">
          <Button
            variant="tonal"
            size="sm"
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Queue</span>
          </Button>
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
            <span>Pending Clearing Queue</span>
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
            <span>Clearance History &amp; Audit Logs</span>
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
                  {filteredPending.length} transfer{filteredPending.length === 1 ? '' : 's'} awaiting commercial clearance
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
                          <span>Connecting to commercial bank gateway…</span>
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
                              <span className="font-mono font-bold text-xs text-md-primary">{paymentId}</span>
                            </td>
                            <td>
                              <CaseIdCell caseId={pc.caseId} />
                            </td>
                            <td>{pc.accountHolderName || pc.beneficiaryId || '—'}</td>
                            <td>
                              <div>{pc.bankName || 'Maybank'}</div>
                              <div className="text-xs font-mono text-md-on-surface-variant">
                                {maskAccount(pc.accountNumber)}
                              </div>
                            </td>
                            <td style={{ fontWeight: 600 }}>{fmtAmount(pc.amount)}</td>
                            <td>
                              <span className="meta-text">
                                {pc.currentSignatures}/{pc.requiredSignatures || 1} met
                              </span>
                            </td>
                            <td>{paymentBadge(pc.status)}</td>
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
                                    setCustomReasonText('');
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
                  {filteredHistory.length} cleared or rejected bank gateway record{filteredHistory.length === 1 ? '' : 's'}
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
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Bank Reference / Failure Diagnostic</th>
                      <th>Timestamp</th>
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
                        const isPaid = normalizePaymentStatus(c.status) === 'Paid';
                        const latestFail = c.failedTransactions?.[c.failedTransactions.length - 1];
                        const paymentId = c.paymentId || `PMT-${c.caseId}`;
                        return (
                          <tr key={c.caseId} className="row-clickable" onClick={() => setDetailModalCase(c)}>
                            <td>
                              <span className="font-mono font-bold text-xs text-md-primary">{paymentId}</span>
                            </td>
                            <td>
                              <CaseIdCell caseId={c.caseId} />
                            </td>
                            <td>{c.accountHolderName || c.beneficiaryId || '—'}</td>
                            <td style={{ fontWeight: 600 }}>{fmtAmount(c.amount)}</td>
                            <td>{paymentBadge(c.status)}</td>
                            <td>
                              {isPaid ? (
                                <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  {c.receipt?.bankReferenceNumber || 'BNK-CLEARED'}
                                </span>
                              ) : (
                                <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                                  {latestFail?.errorLog || 'Bank clearance declined by commercial gateway'}
                                </span>
                              )}
                            </td>
                            <td>
                              <span className="meta-text">{fmtDate(c.updatedAt || c.createdAt)}</span>
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

      <div style={{ marginTop: '32px', fontSize: '13px', color: 'var(--md-on-surface-variant)', opacity: 0.6, textAlign: 'center', borderTop: '1px solid rgba(121,116,126,0.08)', paddingTop: '18px' }}>
        FCR-SCS · Interbank Commercial Clearance Gateway · Simulation Mode · Connected to Live Backend
      </div>

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
              Select a failure reason code below. This will transition the case status to{' '}
              <strong>Transfer Failed</strong> and record the diagnostic error message in the admin Failed Transactions queue for resolution or retry.
            </div>

            <div className="space-y-1">
              <Select
                label="Rejection / Failure Code"
                options={FAILURE_REASONS}
                value={selectedReason}
                onChange={setSelectedReason}
                placeholder="Select bank rejection reason"
              />
            </div>

            {selectedReason === 'CUSTOM' && (
              <div className="space-y-1">
                <Textarea
                  label="Custom Failure Description"
                  rows={3}
                  placeholder="Enter detailed commercial bank error diagnostic..."
                  value={customReasonText}
                  onChange={(e) => setCustomReasonText(e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Full Details Modal */}
      <ViewDetailsModal pc={detailModalCase} onClose={() => setDetailModalCase(null)} />
    </div>
  );
}
