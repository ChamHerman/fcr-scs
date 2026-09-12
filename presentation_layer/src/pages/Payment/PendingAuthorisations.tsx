import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, User, Hourglass, Fingerprint, Loader2, ShieldAlert } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { paymentApi } from '../../services/paymentApi';
import { CaseIdCell } from '../../components/admin/CaseIdCell';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { CopyButton } from '../../components/ui/CopyButton';
import { useAdminIdentity } from '../../hooks/useAdminIdentity';
import { useAuth } from '../../context/AuthContext';
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

type ModalState =
  | { type: 'view'; pc: PaymentRow }
  | { type: 'authorise'; pc: PaymentRow }
  | { type: 'reject'; pc: PaymentRow }
  | { type: 'cancel'; pc: PaymentRow }
  | null;

export default function PendingAuthorisations() {
  const [searchParams] = useSearchParams();
  const deepLink = searchParams.get('caseId');
  const [cases, setCases] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(deepLink || '');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [caseDetailsId, setCaseDetailsId] = useState<string | null>(null);
  const [finalConfirmCase, setFinalConfirmCase] = useState<PaymentRow | null>(null);
  const { identityId } = useAdminIdentity();
  const { user } = useAuth();
  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.pending-header', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' });
    gsap.fromTo('.stats-grid, .filter-bar, .table-wrap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'back.out(1.2)', delay: 0.2 });
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
      { label: 'Awaiting Approval', value: cases.length, change: 'Requires action', icon: Hourglass },
      { label: 'Signatures Outstanding', value: outstanding, change: `Bank 1 + approvals model`, icon: Fingerprint },
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

  const closeModal = () => setModal(null);

  return (
    <div className="main" ref={pageRef}>
      <div className="topbar pending-header">
        <div className="topbar-left">
          <h1>Pending Authorisations</h1>
          <div className="sub">Initiated transfers awaiting secondary approval (multi-signature queue).</div>
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
        <div className="my-4 px-4 py-3 rounded-xl bg-md-error/10 border border-md-error/30 text-md-on-error text-sm">
          {error}
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
        <SearchInput placeholder="Search case ID or beneficiary..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <div className="filter-group">
          <Button variant="outlined" size="sm" onClick={() => setSearchQuery('')}>Clear</Button>
        </div>
      </div>

      <div className="action-bar">
        <div className="left">
          <span className="count">{filtered.length} transfer{filtered.length === 1 ? '' : 's'} awaiting approval</span>
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
                filtered.map((pc) => {
                  const initiator = initiatorOf(pc);
                  const paymentId = pc.paymentId || `PMT-${pc.caseId}`;
                  return (
                    <tr
                      key={pc.caseId}
                      className={`row-clickable${deepLink === pc.caseId ? ' bg-md-secondary-container/40' : ''}`}
                      onClick={() => setModal({ type: 'view', pc })}
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
      </div>

      <div style={{ marginTop: '24px', fontSize: '13px', color: 'var(--md-on-surface-variant)', opacity: 0.6, textAlign: 'center', borderTop: '1px solid rgba(121,116,126,0.08)', paddingTop: '18px' }}>
        FCR-SCS · Payments · Pending Authorisations · Connected to Live Backend Data
      </div>

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
      <CancelPaymentModal
        pc={modal?.type === 'cancel' ? modal.pc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
    </div>
  );
}
