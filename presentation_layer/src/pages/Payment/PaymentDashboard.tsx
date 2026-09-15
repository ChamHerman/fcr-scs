import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, DollarSign, User, XCircle, Hourglass, Loader2, Eye, ShieldAlert, Activity, RefreshCw, CreditCard } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { paymentApi } from '../../services/paymentApi';
import { CaseIdCell } from '../../components/admin/CaseIdCell';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
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
  | { type: 'view'; pc: PaymentRow }
  | { type: 'initiate'; pc: PaymentRow }
  | { type: 'authorise'; pc: PaymentRow }
  | { type: 'reject'; pc: PaymentRow }
  | { type: 'resolve-rejection'; pc: PaymentRow }
  | { type: 'cancel'; pc: PaymentRow }
  | { type: 'retry'; pc: PaymentRow }
  | { type: 'request-update'; pc: PaymentRow }
  | { type: 'schedule'; pc: PaymentRow }
  | { type: 'resolve-dispute'; pc: PaymentRow }
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

/**
 * Default "Action Priority" ranking (user-locked): actionable cases first —
 * Ready to Initiate, then Pending Approval — while terminal/inactive records
 * sink; Bank Details Pending always last and Paid second last.
 */
const STATUS_PRIORITY_RANK: Record<string, number> = {
  'Ready to Initiate': 1,
  'Pending Approval': 2,
  'Bank Details & M1 Pending': 3,
  'Award Notarization Pending': 4,
  'Bank Details Pending': 5,
  'Scheduled': 6,
  'Bank Approval Pending': 7,
  'Transfer Rejected': 8,
  'Transfer Failed': 9,
  'Disputed': 10,
  'New Bank Details Pending': 11,
  'Paid': 12,
  'Cancelled': 13,
};

export default function PaymentDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [allCases, setAllCases] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [caseDetailsId, setCaseDetailsId] = useState<string | null>(null);
  const [finalConfirmCase, setFinalConfirmCase] = useState<PaymentRow | null>(null);
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
      const detailed = getDetailedPaymentStatus(c);
      if (detailed.paymentStatus) set.add(detailed.paymentStatus);
    });
    return ['All', ...Array.from(set).sort()];
  }, [allCases]);

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
  }, [allCases, searchQuery, statusFilter]);

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
          const ra = STATUS_PRIORITY_RANK[detA.paymentStatus] ?? 50;
          const rb = STATUS_PRIORITY_RANK[detB.paymentStatus] ?? 50;
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
        <div className="right">
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
                  const openView = () => setModal({ type: 'view', pc });
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
                      <td>{paymentBadge(detailed.paymentStatus, pc.currentSignatures, pc.requiredSignatures)}</td>
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
        pc={modal?.type === 'view' ? modal.pc : null}
        identityId={identityId}
        onClose={closeModal}
        onAction={(type, target) => {
          if (type === 'confirm-execution') {
            setFinalConfirmCase(target);
          } else {
            setModal({ type, pc: target } as ModalState);
          }
        }}
      />
      <InitiateTransferModal
        pc={modal?.type === 'initiate' ? modal.pc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
      <AuthoriseTransferModal
        pc={modal?.type === 'authorise' ? modal.pc : null}
        onClose={closeModal}
        onDone={() => {
          closeModal();
          loadData();
        }}
      />
      <FinalExecutionConfirmModal
        pc={finalConfirmCase}
        isOpen={Boolean(finalConfirmCase)}
        onConfirm={async () => {
          if (!finalConfirmCase) return;
          await paymentApi.confirmExecution({ caseId: finalConfirmCase.caseId, adminId: identityId });
          setTimeout(() => {
            setFinalConfirmCase(null);
            loadData();
          }, 1100);
        }}
        onHold={() => {
          setFinalConfirmCase(null);
          loadData();
        }}
      />
      <CaseDetailsModal
        caseId={caseDetailsId}
        onClose={() => setCaseDetailsId(null)}
      />
      <RejectTransferModal
        pc={modal?.type === 'reject' ? modal.pc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
      <ResolveRejectionModal
        pc={modal?.type === 'resolve-rejection' ? modal.pc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
      <CancelPaymentModal
        pc={modal?.type === 'cancel' ? modal.pc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
      <RetryPaymentModal
        pc={modal?.type === 'retry' ? modal.pc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
      <RequestDetailsUpdateModal
        pc={modal?.type === 'request-update' ? modal.pc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
      <ScheduleTomorrowModal
        pc={modal?.type === 'schedule' ? modal.pc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
      <ResolveDisputeModal
        pc={modal?.type === 'resolve-dispute' ? modal.pc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
    </div>
  );
}
