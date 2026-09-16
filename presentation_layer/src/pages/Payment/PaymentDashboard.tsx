import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, DollarSign, User, XCircle, Hourglass, Loader2, Eye, ShieldAlert, Activity, RefreshCw, CreditCard } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { paymentApi } from '../../services/paymentApi';
import { CaseIdCell } from '../../components/admin/CaseIdCell';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { CopyButton } from '../../components/ui/CopyButton';
import { Pagination } from '../../components/ui/Pagination';
import { useAdminIdentity } from '../../hooks/useAdminIdentity';
import { useAuth } from '../../context/AuthContext';
import '../LandAcquisition/case_management.css';
import './payment.css';
import {
  PAYMENT_STATUSES,
  normalizePaymentStatus,
  getDetailedPaymentStatus,
} from './statusMaps';
import {
  ViewDetailsModal,
  InitiateTransferModal,
  AuthoriseTransferModal,
  RejectTransferModal,
  ResolveRejectionModal,
  CancelPaymentModal,
  RetryPaymentModal,
  RequestDetailsUpdateModal,
  ScheduleTomorrowModal,
  ResolveDisputeModal,
  FinalExecutionConfirmModal,
  paymentBadge,
  fmtAmount,
  fmtDate,
  maskAccount,
  hasBankDetails,
} from './paymentModals';
import { CaseDetailsModal } from './CaseDetailsModal';
import { PaymentRowActions } from './PaymentRowActions';
import { RefreshButton } from './RefreshButton';
import type { PaymentRow } from './paymentModals';
type ModalState =
  | { type: 'view'; caseId: string }
  | { type: 'initiate'; caseId: string }
  | { type: 'authorise'; caseId: string }
  | { type: 'reject'; caseId: string }
  | { type: 'resolve-rejection'; caseId: string }
  | { type: 'cancel'; caseId: string }
  | { type: 'retry'; caseId: string }
  | { type: 'request-update'; caseId: string }
  | { type: 'schedule'; caseId: string }
  | { type: 'resolve-dispute'; caseId: string }
  | null;

const ITEMS_PER_PAGE = 10;

const SORT_STORAGE_KEY = 'payment_overview_sort';
type SortKey = 'priority' | 'recent' | 'amount-desc' | 'amount-asc';
const SORT_OPTIONS = [
  { value: 'priority', label: 'Default (Action Priority)' },
  { value: 'recent', label: 'Most Recent Activity' },
  { value: 'amount-desc', label: 'Amount (High to Low)' },
  { value: 'amount-asc', label: 'Amount (Low to High)' },
] as const;

const normalizeStatusRankKey = (s?: string) =>
  (s || '').toUpperCase().replace(/&/g, 'AND').replace(/\s+/g, '_');

/**
 * Default primary sorting priority:
 * 1. READY_TO_INITIATE
 * 2. PENDING_APPROVAL
 * 3. AWARD_NOTARIZATION_PENDING
 * 4. BANK_DETAILS_AND_M1_PENDING
 * 5. NEW_BANK_DETAILS_PENDING
 * 6. BANK_DETAILS_PENDING
 * 7. BANK_APPROVAL_PENDING
 * 8. TRANSFER_SUCCEED
 * 9. SCHEDULED
 * 10. PAID
 * 11. TRANSFER_REJECTED
 * 12. TRANSFER_FAILED
 * 13. DISPUTED
 * 14. CANCELLED
 */
const STATUS_PRIORITY_RANK: Record<string, number> = {
  'READY_TO_INITIATE': 1,
  'Ready to Initiate': 1,
  'PENDING_APPROVAL': 2,
  'Pending Approval': 2,
  'AWARD_NOTARIZATION_PENDING': 3,
  'Award Notarization Pending': 3,
  'BANK_DETAILS_AND_M1_PENDING': 4,
  'Bank Details & M1 Pending': 4,
  'NEW_BANK_DETAILS_PENDING': 5,
  'New Bank Details Pending': 5,
  'BANK_DETAILS_PENDING': 6,
  'Bank Details Pending': 6,
  'BANK_APPROVAL_PENDING': 7,
  'Bank Approval Pending': 7,
  'TRANSFER_SUCCEED': 8,
  'Transfer Succeed': 8,
  'SCHEDULED': 9,
  'Scheduled': 9,
  'PAID': 10,
  'Paid': 10,
  'TRANSFER_REJECTED': 11,
  'Transfer Rejected': 11,
  'TRANSFER_FAILED': 12,
  'Transfer Failed': 12,
  'DISPUTED': 13,
  'Disputed': 13,
  'CANCELLED': 14,
  'Cancelled': 14,
};

export default function PaymentDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCancelled, setShowCancelled] = useState(false);
  const [allCases, setAllCases] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [caseDetailsId, setCaseDetailsId] = useState<string | null>(null);
  const [finalConfirmCaseId, setFinalConfirmCaseId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    const stored = localStorage.getItem(SORT_STORAGE_KEY) as SortKey | null;
    return stored && SORT_OPTIONS.some((o) => o.value === stored) ? stored : 'priority';
  });
  const { identityId } = useAdminIdentity();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(SORT_STORAGE_KEY, sortKey);
  }, [sortKey]);

  useGSAP(() => {
    gsap.fromTo('.stat-card', { opacity: 0, y: 28, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.1, ease: 'back.out(1.3)', delay: 0.1 });
    gsap.fromTo('.filter-bar, .action-bar, .table-wrap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.07, ease: 'power2.out', delay: 0.45 });
  }, { scope: containerRef });

  const loadData = useCallback(async (preservePage = true, silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const allRes = await paymentApi.getAllCases();
      const rawCases = allRes.cases || [];
      const eligible = rawCases.filter((c: any) => {
        const raw = (c.caseStatus || '').toUpperCase().replace(/\s+/g, '_');
        return raw !== 'OFFER_ISSUED' && raw !== 'OFFER_REJECTED' && raw !== 'CASE_REGISTERED' && c.status !== 'Offer Issued';
      });
      setAllCases(eligible);
      if (!preservePage) setCurrentPage(1);
    } catch (err: any) {
      setError(err.message || 'Failed to load payment data');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const pending = allCases.filter(
      (c) =>
        ['Transfer Initiated', 'Authorised'].includes(normalizePaymentStatus(c.status)) &&
        (c.currentSignatures ?? 0) < (c.requiredSignatures ?? 1)
    ).length;
    const failed = allCases.filter((c) => ['Transfer Failed', 'Transfer Rejected'].includes(normalizePaymentStatus(c.status))).length;
    const paid = allCases.filter((c) => normalizePaymentStatus(c.status) === 'Paid').length;
    return [
      { label: 'Total Payment Cases', value: allCases.length, icon: DollarSign, iconColor: 'text-md-primary' },
      { label: 'Pending Authorisations', value: pending, icon: Hourglass, iconColor: 'text-amber-500' },
      { label: 'Failed Transfers', value: failed, icon: XCircle, iconColor: 'text-red-500' },
      { label: 'Paid', value: paid, icon: Clock, iconColor: 'text-emerald-500' },
    ];
  }, [allCases]);

  // Dynamically derive available statuses strictly from loaded payment records
  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    allCases.forEach((c) => {
      if (!showCancelled && normalizePaymentStatus(c.status) === 'Cancelled') {
        return;
      }
      const detailed = getDetailedPaymentStatus(c);
      if (detailed.paymentStatus) set.add(detailed.paymentStatus);
    });
    return ['All', ...Array.from(set).sort()];
  }, [allCases, showCancelled]);

  useEffect(() => {
    if (statusFilter !== 'All' && !availableStatuses.includes(statusFilter)) {
      setStatusFilter('All');
    }
  }, [availableStatuses, statusFilter]);

  const filteredCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allCases.filter((c) => {
      const raw = (c.caseStatus || '').toUpperCase().replace(/\s+/g, '_');
      if (raw === 'OFFER_ISSUED' || raw === 'OFFER_REJECTED' || raw === 'CASE_REGISTERED' || c.status === 'Offer Issued') {
        return false;
      }
      const isCancelled = normalizePaymentStatus(c.status) === 'Cancelled';
      if (!showCancelled && statusFilter !== 'Cancelled' && isCancelled) {
        return false;
      }
      const detailed = getDetailedPaymentStatus(c);
      const matchesStatus =
        statusFilter === 'All' ||
        detailed.paymentStatus === statusFilter ||
        detailed.caseStatus === statusFilter ||
        normalizePaymentStatus(c.status) === statusFilter;
      const matchesSearch =
        !q ||
        c.caseId.toLowerCase().includes(q) ||
        (c.accountHolderName ?? '').toLowerCase().includes(q) ||
        (c.bankName ?? '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [allCases, searchQuery, statusFilter, showCancelled]);

  const sortedCases = useMemo(() => {
    const getPmtId = (r: PaymentRow) => r.paymentId || r.id || `PMT-${r.caseId}`;
    const byPmtIdAsc = (a: PaymentRow, b: PaymentRow) =>
      getPmtId(a).localeCompare(getPmtId(b), undefined, { numeric: true, sensitivity: 'base' });
    const byTimeDesc = (a: PaymentRow, b: PaymentRow) =>
      new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();

    const rows = [...filteredCases];
    switch (sortKey) {
      case 'recent':
        return rows.sort((a, b) => {
          const tCmp = byTimeDesc(a, b);
          if (tCmp !== 0) return tCmp;
          return byPmtIdAsc(a, b);
        });
      case 'amount-desc':
        return rows.sort((a, b) => {
          const diff = Number(b.amount || 0) - Number(a.amount || 0);
          if (diff !== 0) return diff;
          return byPmtIdAsc(a, b);
        });
      case 'amount-asc':
        return rows.sort((a, b) => {
          const diff = Number(a.amount || 0) - Number(b.amount || 0);
          if (diff !== 0) return diff;
          return byPmtIdAsc(a, b);
        });
      case 'priority':
      default:
        return rows.sort((a, b) => {
          const detA = getDetailedPaymentStatus(a);
          const detB = getDetailedPaymentStatus(b);
          const keyA = normalizeStatusRankKey(detA.paymentStatus);
          const keyB = normalizeStatusRankKey(detB.paymentStatus);
          const ra = STATUS_PRIORITY_RANK[keyA] ?? STATUS_PRIORITY_RANK[detA.paymentStatus] ?? 99;
          const rb = STATUS_PRIORITY_RANK[keyB] ?? STATUS_PRIORITY_RANK[detB.paymentStatus] ?? 99;
          if (ra !== rb) return ra - rb;
          // Secondary sort: Payment ID using natural numerical ordering
          const pmtCmp = byPmtIdAsc(a, b);
          if (pmtCmp !== 0) return pmtCmp;
          return byTimeDesc(a, b);
        });
    }
  }, [filteredCases, sortKey]);

  const totalCount = sortedCases.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, pageCount);
  const pageRows = sortedCases.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const closeModal = () => setModal(null);

  const modalPc = useMemo(
    () => (modal ? allCases.find((c) => c.caseId === modal.caseId) ?? null : null),
    [modal, allCases]
  );

  const finalConfirmPc = useMemo(
    () => (finalConfirmCaseId ? allCases.find((c) => c.caseId === finalConfirmCaseId) ?? null : null),
    [finalConfirmCaseId, allCases]
  );

  // Opening a modal silently re-fetches so the modal renders current backend
  // state, not the snapshot the row was rendered with.
  const openModal = useCallback(
    (type: Exclude<ModalState, null>['type'], caseId: string) => {
      setModal({ type, caseId } as ModalState);
      loadData(true, true);
    },
    [loadData]
  );

  return (
    <div className="main" ref={containerRef}>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Payments Overview</h1>
          <div className="sub">Full view of the payment lifecycle — initiate, authorise, resolve and track every case.</div>
        </div>
        <div className="topbar-right">
          <div className="date-badge">
            <Clock size={16} className="inline mr-1" style={{ display: 'inline-block', verticalAlign: 'text-bottom' }} /> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          <div className="avatar">
            <User size={20} />
          </div>
        </div>
      </div>

      {user?.role === 'SYSTEM_ADMINISTRATOR' && (
        <div className="my-4 px-4 py-3 rounded-xl bg-md-surface-container-highest border border-md-outline/20 text-md-on-surface text-sm flex items-center gap-3">
          <ShieldAlert className="text-amber-500 shrink-0" size={18} />
          <span>
            <strong>View-Only Mode:</strong> System Administrators have read-only access and cannot perform disbursement mutations.
          </span>
        </div>
      )}
      {error && (
        <div className="my-4 px-4 py-3 rounded-xl bg-md-error/10 border border-md-error/30 text-md-on-error text-sm flex items-center justify-between gap-4">
          <span>{error}</span>
          <Button variant="text" size="sm" onClick={() => loadData()}>Retry</Button>
        </div>
      )}

      <div className="stats-grid">
        {stats.map((stat, idx) => (
          <div key={idx} className="stat-card">
            <stat.icon className={`stat-icon ${stat.iconColor || 'text-md-primary'}`} size={32} />
            <div className="stat-label">{stat.label}</div>
            <div className="stat-number">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <SearchInput
          placeholder="Search case ID, beneficiary or bank..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="filter-group">
          <Select
            label="Sort"
            options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={sortKey}
            onChange={(v) => {
              setSortKey(v as SortKey);
              setCurrentPage(1);
            }}
            placeholder="Sort records"
            wrapLabels
          />
          <Select
            label="Status"
            options={availableStatuses.map((s) => ({ value: s, label: s === 'All' ? 'All statuses' : s }))}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setCurrentPage(1);
            }}
            placeholder="All statuses"
            wrapLabels
          />
          <Button
            variant="outlined"
            size="sm"
            onClick={() => {
              setStatusFilter('All');
              setSearchQuery('');
              setShowCancelled(false);
              setCurrentPage(1);
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="action-bar">
        <div className="left">
          <CreditCard size={18} />
          <span className="count">Disbursement activity ({totalCount})</span>
        </div>
        <div className="right flex items-center gap-3">
          <div className="h-9 px-3 rounded-full bg-md-surface-container-high/60 dark:bg-md-surface-container-high border border-md-outline/15 shadow-inner inline-flex items-center">
            <Switch
              size="sm"
              id="dashboard-show-cancelled"
              label={
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="text-xs text-md-on-surface-variant">Show</span>
                  <span className="payment-badge status-cancelled !py-0.5 !px-2 !text-[11px] !h-5.5">
                    <span className="dot" />
                    Cancelled
                  </span>
                </span>
              }
              checked={showCancelled}
              onChange={(e) => {
                setShowCancelled(e.target.checked);
                setCurrentPage(1);
              }}
            />
          </div>
          <RefreshButton onClick={() => loadData()} loading={loading} />
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: '135px' }}>Payment ID</th>
                <th style={{ width: '175px' }}>Case ID</th>
                <th style={{ width: '140px' }}>Beneficiary</th>
                <th style={{ width: '150px' }}>Bank</th>
                <th style={{ width: '130px' }}>Amount</th>
                <th style={{ width: '150px' }}>Updated</th>
                <th style={{ width: '200px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-8">
                    <Loader2 size={22} className="inline animate-spin" />
                    <span className="ml-2">Loading payment records…</span>
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-8">
                    {error ? 'Failed to load data.' : 'No payment records match your filters.'}
                  </td>
                </tr>
              ) : (
                pageRows.map((pc) => {
                  const detailed = getDetailedPaymentStatus(pc);
                  const openView = () => openModal('view', pc.caseId);
                  const paymentId = pc.paymentId || `PMT-${pc.caseId}`;
                  return (
                    <tr key={pc.caseId} className="row-clickable" onClick={openView}>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-md-primary">
                            {paymentId}
                          </span>
                          <CopyButton value={paymentId} title="Copy Payment ID" />
                        </div>
                      </td>
                      <td><CaseIdCell caseId={pc.caseId} onClick={(cid) => setCaseDetailsId(cid)} /></td>
                      <td>{pc.accountHolderName || pc.beneficiaryId || '—'}</td>
                      <td>
                        {detailed.paymentStatus !== 'Bank Details Pending' &&
                          detailed.paymentStatus !== 'New Bank Details Pending' &&
                          pc.bankName &&
                          pc.accountNumber ? (
                          <div className="flex items-center gap-1.5">
                            <span>{pc.bankName}</span>
                            <span className="font-mono text-xs text-md-on-surface-variant">{maskAccount(pc.accountNumber)}</span>
                            <CopyButton value={pc.accountNumber} title="Copy Account Number" />
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="font-semibold">{fmtAmount(pc.amount)}</td>
                      <td><span className="meta-text font-mono text-xs">{fmtDate(pc.updatedAt || pc.createdAt)}</span></td>
                      <td>{paymentBadge(detailed.paymentStatus, pc.currentSignatures, pc.requiredSignatures, pc.scheduledFor)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && (
          <Pagination
            currentPage={safePage}
            totalPages={pageCount}
            totalCount={totalCount}
            pageSize={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
            itemLabel="records"
          />
        )}
      </div>

      <div style={{ height: '32px' }} />

      {/* Modals */}
      <ViewDetailsModal
        pc={modal?.type === 'view' ? modalPc : null}
        identityId={identityId}
        onClose={closeModal}
        onAction={(type, target) => {
          if (type === 'confirm-execution') {
            setFinalConfirmCaseId(target.caseId);
            loadData(true, true);
          } else if (type === 'confirm-receipt') {
            loadData(true, true);
          } else {
            openModal(type as Exclude<ModalState, null>['type'], target.caseId);
          }
        }}
      />
      <InitiateTransferModal
        pc={modal?.type === 'initiate' ? modalPc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
      <AuthoriseTransferModal
        pc={modal?.type === 'authorise' ? modalPc : null}
        onClose={closeModal}
        onDone={() => {
          closeModal();
          loadData();
        }}
      />
      <FinalExecutionConfirmModal
        pc={finalConfirmPc}
        isOpen={Boolean(finalConfirmCaseId)}
        onConfirm={async () => {
          if (!finalConfirmPc) return;
          await paymentApi.confirmExecution({ caseId: finalConfirmPc.caseId, adminId: identityId });
          setTimeout(() => {
            setFinalConfirmCaseId(null);
            loadData();
          }, 1100);
        }}
        onHold={() => {
          setFinalConfirmCaseId(null);
          loadData();
        }}
      />
      <CaseDetailsModal
        caseId={caseDetailsId}
        onClose={() => setCaseDetailsId(null)}
      />
      <RejectTransferModal
        pc={modal?.type === 'reject' ? modalPc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
      <ResolveRejectionModal
        pc={modal?.type === 'resolve-rejection' ? modalPc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
      <CancelPaymentModal
        pc={modal?.type === 'cancel' ? modalPc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
      <RetryPaymentModal
        pc={modal?.type === 'retry' ? modalPc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
      <RequestDetailsUpdateModal
        pc={modal?.type === 'request-update' ? modalPc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
      <ScheduleTomorrowModal
        pc={modal?.type === 'schedule' ? modalPc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
      <ResolveDisputeModal
        pc={modal?.type === 'resolve-dispute' ? modalPc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
    </div>
  );
}
