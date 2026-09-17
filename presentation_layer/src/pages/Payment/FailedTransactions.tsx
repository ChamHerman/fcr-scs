import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, User, AlertOctagon, Loader2, FileWarning, ShieldAlert, Activity, RefreshCw, AlertTriangle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { paymentApi } from '../../services/paymentApi';
import { CaseIdCell } from '../../components/admin/CaseIdCell';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { CopyButton } from '../../components/ui/CopyButton';
import { OwnerStack } from '../../components/payment/OwnerStack';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { useAdminIdentity } from '../../hooks/useAdminIdentity';
import { useAuth } from '../../context/AuthContext';
import './payment.css';
import { RefreshButton } from './RefreshButton';
import {
  ViewDetailsModal,
  RetryPaymentModal,
  RequestDetailsUpdateModal,
  ScheduleTomorrowModal,
  CancelPaymentModal,
  ResolveRejectionModal,
  ResolveDisputeModal,
  paymentBadge,
  fmtAmount,
  fmtDate,
  stripRawLogPrefix,
  formatResolutionLabel,
} from './paymentModals';
import { CaseDetailsModal } from './CaseDetailsModal';
import { PaymentRowActions } from './PaymentRowActions';
import type { PaymentRow } from './paymentModals';
import { normalizePaymentStatus, byFailedTransactionPriority, isFailedRegisterStatus } from './statusMaps';
type ModalState =
  | { type: 'view'; caseId: string }
  | { type: 'error-log'; caseId: string }
  | { type: 'retry'; caseId: string }
  | { type: 'request-update'; caseId: string }
  | { type: 'schedule'; caseId: string }
  | { type: 'cancel'; caseId: string }
  | { type: 'resolve-rejection'; caseId: string }
  | { type: 'resolve-dispute'; caseId: string }
  | null;

export default function FailedTransactions() {
  const [searchParams] = useSearchParams();
  const deepLink = searchParams.get('caseId');
  const [cases, setCases] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(deepLink || '');
  const [showCancelled, setShowCancelled] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [caseDetailsId, setCaseDetailsId] = useState<string | null>(null);
  const { identityId } = useAdminIdentity();
  const { user } = useAuth();
  const pageRef = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    gsap.fromTo('.failed-header', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' });
    gsap.fromTo('.stats-grid, .filter-bar, .action-bar, .table-wrap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'back.out(1.2)', delay: 0.2 });
  }, { scope: pageRef });

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await paymentApi.getFailedTransactions();
      setCases(res.cases || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load failed transactions');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const failed = cases.filter((c) => ['Transfer Failed', 'Transfer Rejected'].includes(normalizePaymentStatus(c.status))).length;
    const unresolved = cases.filter((c) => {
      const ft = c.failedTransactions ?? [];
      return ft.length === 0 || ft[ft.length - 1].resolution == null;
    }).length;
    return [
      { label: 'Failed / Rejected', value: failed, icon: AlertOctagon, iconColor: 'text-red-500' },
      { label: 'Pending Resolution', value: unresolved, icon: FileWarning, iconColor: 'text-amber-500' },
    ];
  }, [cases]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cases
      .filter((c) => {
        // Defensive mirror of the backend allow-list: a case that has moved on
        // from a failure/dispute/rejection must never render in this register.
        if (!isFailedRegisterStatus(c.status)) return false;
        if (!showCancelled && normalizePaymentStatus(c.status) === 'Cancelled') {
          return false;
        }
        return !q || c.caseId.toLowerCase().includes(q) || (c.accountHolderName ?? '').toLowerCase().includes(q);
      })
      .sort(byFailedTransactionPriority);
  }, [cases, searchQuery, showCancelled]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const closeModal = () => setModal(null);

  const modalPc = useMemo(
    () => (modal ? cases.find((c) => c.caseId === modal.caseId) ?? null : null),
    [modal, cases]
  );

  // Opening a modal silently re-fetches so it renders current backend state,
  // not the snapshot the row was rendered with.
  const openModal = useCallback(
    (type: Exclude<ModalState, null>['type'], caseId: string) => {
      setModal({ type, caseId } as ModalState);
      loadData(true);
    },
    [loadData]
  );

  const selectedErrorLog = modal?.type === 'error-log' ? modalPc : null;

  return (
    <div className="main" ref={pageRef}>
      <div className="topbar failed-header">
        <div className="topbar-left">
          <h1>Failed Transactions</h1>
          <div className="sub">Every bank error / processing anomaly lands here with its error log — resolve via SOP actions.</div>
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
        <div className="my-4 px-4 py-3 rounded-xl bg-md-error/10 border border-md-error/30 text-md-on-error text-sm">
          {error}
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
        <SearchInput placeholder="Search case ID or beneficiary..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <div className="filter-group">
          <Button
            variant="outlined"
            size="sm"
            onClick={() => {
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
          <AlertTriangle size={18} />
          <span className="count">Failed transactions ({filtered.length})</span>
        </div>
        <div className="right flex items-center gap-3">
          <div className="h-9 px-3 rounded-full bg-md-surface-container-high/60 dark:bg-md-surface-container-high border border-md-outline/15 shadow-inner inline-flex items-center">
            <Switch
              size="sm"
              id="failed-show-cancelled"
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
                <th style={{ width: '150px' }}>Payment ID</th>
                <th style={{ width: '185px' }}>Case ID</th>
                <th style={{ width: '150px' }}>Beneficiary</th>
                <th style={{ width: '280px' }}>Error</th>
                <th style={{ width: '160px' }}>Attempted At</th>
                <th style={{ width: '180px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">
                    <Loader2 size={22} className="inline animate-spin" /><span className="ml-2">Loading failed transactions…</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">No failed transactions requiring resolution.</td>
                </tr>
              ) : (
                pageRows.map((pc) => {
                  const ft = pc.failedTransactions ?? [];
                  const latest = ft[ft.length - 1];
                  // GA-rejected cases (FR-018) carry no failedTransaction row —
                  // surface the rejection reason from the governance audit list.
                  const rejectionReason = [...(pc.authorisations ?? [])]
                    .reverse()
                    .find((a) => a.action === 'reject')?.reason;
                  const errorLog = latest
                    ? stripRawLogPrefix(latest.errorLog)
                    : rejectionReason
                      ? `Rejected by Government Admin: ${rejectionReason}`
                      : 'No error log available.';
                  const paymentId = pc.paymentId || `PMT-${pc.caseId}`;
                  return (
                    <tr
                      key={pc.caseId}
                      className={`row-clickable${deepLink === pc.caseId ? ' bg-md-secondary-container/40' : ''}`}
                      onClick={() => openModal('view', pc.caseId)}
                    >
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-md-primary">
                            {paymentId}
                          </span>
                          <CopyButton value={paymentId} title="Copy Payment ID" />
                        </div>
                      </td>
                      <td><CaseIdCell caseId={pc.caseId} onClick={(cid) => setCaseDetailsId(cid)} /></td>
                      <td><OwnerStack owners={pc.beneficiaries} fallback={{ accountHolderName: pc.accountHolderName, myKadNumber: pc.myKadNumber, bankName: pc.bankName, accountNumber: pc.accountNumber, amount: pc.amount }} compact /></td>
                      <td>
                        <span className="meta-text" style={{ display: 'block', maxWidth: 280 }}>
                          {errorLog.length > 70 ? `${errorLog.slice(0, 70)}…` : errorLog}
                        </span>
                      </td>
                      <td><span className="meta-text font-mono text-xs">{latest ? fmtDate(latest.createdAt) : fmtDate(pc.updatedAt)}</span></td>
                      <td>{paymentBadge(pc.status, pc.currentSignatures, pc.requiredSignatures, pc.scheduledFor)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemLabel="failed transactions"
      />

      <div style={{ height: '32px' }} />

      <CaseDetailsModal
        caseId={caseDetailsId}
        onClose={() => setCaseDetailsId(null)}
      />

      {/* View Error Logs modal */}
      <Modal isOpen={Boolean(selectedErrorLog)} onClose={closeModal} title="Error Logs" subtitle={selectedErrorLog ? `Case ${selectedErrorLog.caseId} · ${fmtAmount(selectedErrorLog.amount)}` : ''} cancelText="Close">
        {selectedErrorLog && (
          <div className="space-y-4">
            <div className="payment-detail-item">
              <div className="label">Record</div>
              <div className="value">{selectedErrorLog.accountHolderName || selectedErrorLog.beneficiaryId} · {selectedErrorLog.bankName || '—'} · {fmtAmount(selectedErrorLog.amount)}</div>
            </div>
            <div>
              <div className="label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--md-on-surface-variant)', marginBottom: 8 }}>
                Attempt History
              </div>
              <div className="space-y-2">
                {(selectedErrorLog.failedTransactions ?? []).length === 0 && (
                  <p className="text-sm text-md-on-surface-variant">No attempt records.</p>
                )}
                {(selectedErrorLog.failedTransactions ?? []).map((f, i) => (
                  <div key={i} className="bg-md-surface-container-low rounded-xl px-4 py-3 border border-md-outline/10">
                    <div className="text-xs text-md-on-surface-variant mb-1">
                      Attempt #{i + 1} · {fmtDate(f.createdAt)}
                    </div>
                    <div className="text-sm text-md-on-surface break-words whitespace-pre-wrap">{stripRawLogPrefix(f.errorLog)}</div>
                    {f.resolution && (
                      <div className="text-xs text-md-on-success mt-1">
                        Resolution: {formatResolutionLabel(f.resolution)} {f.resolvedAt ? `· ${fmtDate(f.resolvedAt)}` : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ViewDetailsModal
        pc={modal?.type === 'view' ? modalPc : null}
        identityId={identityId}
        onClose={closeModal}
        onAction={(type, target) => {
          if (type === 'confirm-execution' || type === 'confirm-receipt') return;
          openModal(type as Exclude<ModalState, null>['type'], target.caseId);
        }}
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
      <CancelPaymentModal
        pc={modal?.type === 'cancel' ? modalPc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
      <ResolveRejectionModal
        pc={modal?.type === 'resolve-rejection' ? modalPc : null}
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
