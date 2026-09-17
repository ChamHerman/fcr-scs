import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, User, Hourglass, Fingerprint, Loader2, ShieldAlert, Activity, RefreshCw, PenLine } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { paymentApi } from '../../services/paymentApi';
import { CaseIdCell } from '../../components/admin/CaseIdCell';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { CopyButton } from '../../components/ui/CopyButton';
import { Pagination } from '../../components/ui/Pagination';
import { useAdminIdentity } from '../../hooks/useAdminIdentity';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/ui/PageHeader';
import './payment.css';
import { RefreshButton } from './RefreshButton';
import {
  ViewDetailsModal,
  AuthoriseTransferModal,
  RejectTransferModal,
  CancelPaymentModal,
  FinalExecutionConfirmModal,
  paymentBadge,
  fmtAmount,
  initiatorOf,
  hasSignedOrInitiated,
  signaturesLeft,
} from './paymentModals';
import { CaseDetailsModal } from './CaseDetailsModal';
import { PaymentRowActions } from './PaymentRowActions';
import type { PaymentRow } from './paymentModals';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

type ModalState =
  | { type: 'view'; caseId: string }
  | { type: 'authorise'; caseId: string }
  | { type: 'reject'; caseId: string }
  | { type: 'cancel'; caseId: string }
  | null;

export default function PendingAuthorisations() {
  useDocumentTitle('Pending Authorisations');
  const [searchParams] = useSearchParams();
  const deepLink = searchParams.get('caseId');
  const [cases, setCases] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(deepLink || '');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [caseDetailsId, setCaseDetailsId] = useState<string | null>(null);
  const [finalConfirmCaseId, setFinalConfirmCaseId] = useState<string | null>(null);
  const { identityId } = useAdminIdentity();
  const { user } = useAuth();
  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.pending-header', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' });
    gsap.fromTo('.stats-grid, .filter-bar, .action-bar, .table-wrap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'back.out(1.2)', delay: 0.2 });
  }, { scope: pageRef });

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await paymentApi.getPendingAuthorisations();
      setCases(res.cases || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load pending authorisations');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const outstanding = cases.reduce((sum, c) => sum + signaturesLeft(c), 0);
    return [
      { label: 'Awaiting Approval', value: cases.length, icon: Hourglass, iconColor: 'text-amber-500' },
      { label: 'Signatures Outstanding', value: outstanding, icon: Fingerprint, iconColor: 'text-md-primary' },
    ];
  }, [cases]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = cases.filter(
      (c) =>
        !q ||
        c.caseId.toLowerCase().includes(q) ||
        (c.accountHolderName ?? '').toLowerCase().includes(q)
    );

    return result.sort((a, b) => {
      const aBlocked = hasSignedOrInitiated(a, identityId);
      const bBlocked = hasSignedOrInitiated(b, identityId);

      // Unblocked (actionable / can be authorised) on top, followed by self-signed
      if (aBlocked !== bBlocked) {
        return aBlocked ? 1 : -1;
      }

      // Within each group, sort latest first (updatedAt or createdAt descending)
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [cases, searchQuery, identityId]);

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

  const finalConfirmPc = useMemo(
    () => (finalConfirmCaseId ? cases.find((c) => c.caseId === finalConfirmCaseId) ?? null : null),
    [finalConfirmCaseId, cases]
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

  return (
    <div className="main" ref={pageRef}>
      <PageHeader
        title="Pending Authorisations"
        subtitle="Initiated transfers awaiting secondary approval (multi-signature queue)."
      />

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
          <Button variant="outlined" size="sm" onClick={() => setSearchQuery('')}>Clear</Button>
        </div>
      </div>

      <div className="action-bar">
        <div className="left">
          <PenLine size={18} />
          <span className="count">Authorisation queue ({filtered.length})</span>
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
                <th style={{ width: '130px' }}>Amount</th>
                <th style={{ width: '140px' }}>Initiator</th>
                <th style={{ width: '180px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">
                    <Loader2 size={22} className="inline animate-spin" /><span className="ml-2">Loading pending authorisations…</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">No pending authorisations in queue.</td>
                </tr>
              ) : (
                pageRows.map((pc) => {
                  const initiator = initiatorOf(pc);
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
                      <td>{pc.accountHolderName || pc.beneficiaryId || '—'}</td>
                      <td className="font-semibold">{fmtAmount(pc.amount)}</td>
                      <td><span className="meta-text">{initiator || '—'}</span></td>
                      <td>{paymentBadge(pc.status, pc.currentSignatures, pc.requiredSignatures)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="pending authorisations"
        />
      </div>

      <div style={{ height: '32px' }} />

      <ViewDetailsModal
        pc={modal?.type === 'view' ? modalPc : null}
        identityId={identityId}
        onClose={closeModal}
        onAction={(type, target) => {
          if (type === 'confirm-execution') {
            setFinalConfirmCaseId(target.caseId);
            loadData(true);
          } else if (type === 'confirm-receipt') {
            loadData(true);
          } else {
            openModal(type as Exclude<ModalState, null>['type'], target.caseId);
          }
        }}
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
      <CancelPaymentModal
        pc={modal?.type === 'cancel' ? modalPc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
    </div>
  );
}
