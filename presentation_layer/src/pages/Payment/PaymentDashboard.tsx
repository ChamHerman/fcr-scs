import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, DollarSign, User, XCircle, Hourglass, Loader2, Eye, ShieldAlert } from 'lucide-react';
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
import type { PaymentRow } from './paymentModals';
import { RefreshButton } from './RefreshButton';
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
  { value: 'priority', label: 'Action Priority (ready > pending, paid near last)' },
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
  'Scheduled': 3,
  'Bank Approval Pending': 4,
  'Transfer Rejected': 5,
  'Transfer Failed': 6,
  'Disputed': 7,
  'New Bank Details Pending': 8,
  'Cancelled': 9,
  'Paid': 10,
  'Bank Details Pending': 11,
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
      setAllCases(allRes.cases || []);
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
      { label: 'Total Payment Cases', value: allCases.length, change: 'All records', icon: DollarSign },
      { label: 'Pending Authorisations', value: pending, change: 'Requires Action', icon: Hourglass },
      { label: 'Failed Transfers', value: failed, change: 'Failed / Rejected', icon: XCircle },
      { label: 'Paid', value: paid, change: 'Executed', icon: Clock },
    ];
  }, [allCases]);

  const filteredCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allCases.filter((c) => {
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
    const byTimeDesc = (a: PaymentRow, b: PaymentRow) =>
      new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
    const rows = [...filteredCases];
    switch (sortKey) {
      case 'recent':
        return rows.sort(byTimeDesc);
      case 'amount-desc':
        return rows.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
      case 'amount-asc':
        return rows.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
      case 'priority':
      default:
        return rows.sort((a, b) => {
          const ra = STATUS_PRIORITY_RANK[normalizePaymentStatus(a.status)] ?? 50;
          const rb = STATUS_PRIORITY_RANK[normalizePaymentStatus(b.status)] ?? 50;
          return ra !== rb ? ra - rb : byTimeDesc(a, b);
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
          <RefreshButton onClick={() => loadData()} loading={loading} />
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
            <stat.icon className="stat-icon" size={32} />
            <div className="stat-label">{stat.label}</div>
            <div className="stat-number">{stat.value}</div>
            <div className="stat-change">{stat.change}</div>
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
            options={PAYMENT_STATUSES.map((s) => ({ value: s, label: s === 'All' ? 'All statuses' : s }))}
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
          <span className="count">Showing {totalCount} payment records</span>
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
                <th style={{ width: '180px' }}>Status</th>
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

      <div style={{ marginTop: '24px', fontSize: '13px', color: 'var(--md-on-surface-variant)', opacity: 0.6, textAlign: 'center', borderTop: '1px solid rgba(121,116,126,0.08)', paddingTop: '18px' }}>
        FCR-SCS · Payments · Connected to Live Backend Data
      </div>

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
          setFinalConfirmCase(null);
          loadData();
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
