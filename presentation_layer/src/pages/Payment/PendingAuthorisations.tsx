import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, User, Hourglass, Fingerprint, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { paymentApi } from '../../services/paymentApi';
import { ActionMenuPortal } from '../../components/ui/ActionMenuPortal';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { useAdminIdentity } from '../../hooks/useAdminIdentity';
import '../LandAcquisition/case_management.css';
import './payment.css';
import {
  ViewDetailsModal,
  AuthoriseTransferModal,
  RejectTransferModal,
  paymentBadge,
  fmtAmount,
  fmtDate,
  initiatorOf,
  hasSignedOrInitiated,
} from './paymentModals';
import type { PaymentRow } from './paymentModals';

type ModalState =
  | { type: 'view'; pc: PaymentRow }
  | { type: 'authorise'; pc: PaymentRow }
  | { type: 'reject'; pc: PaymentRow }
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
  const { identityId, identityLabel } = useAdminIdentity();
  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.pending-header', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' });
    gsap.fromTo('.stats-grid, .filter-bar, .table-wrap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'back.out(1.2)', delay: 0.2 });
  }, { scope: pageRef });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await paymentApi.getPendingAuthorisations();
      setCases(res.cases || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load pending authorisations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const outstanding = cases.filter((c) => !hasSignedOrInitiated(c, identityId)).length;
    return [
      { label: 'Awaiting Approval', value: cases.length, change: 'Transfer Initiated', icon: Hourglass },
      { label: 'Signatures Outstanding', value: outstanding, change: `You (${identityLabel}) can sign`, icon: Fingerprint },
    ];
  }, [cases, identityId, identityLabel]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cases.filter((c) => !q || c.caseId.toLowerCase().includes(q) || (c.accountHolderName ?? '').toLowerCase().includes(q));
  }, [cases, searchQuery]);

  const closeModal = () => setModal(null);

  return (
    <div className="main" ref={pageRef}>
      <div className="topbar pending-header">
        <div className="topbar-left">
          <h1>Pending Authorisations</h1>
          <div className="sub">Initiated transfers awaiting secondary approval (multi-signature queue).</div>
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
                <th>Case ID</th>
                <th>Beneficiary</th>
                <th>Amount</th>
                <th>Sigs</th>
                <th>Initiator</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-8">
                    <Loader2 size={22} className="inline animate-spin" /><span className="ml-2">Loading pending authorisations…</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-8">No pending authorisations in queue.</td>
                </tr>
              ) : (
                filtered.map((pc) => {
                  const initiator = initiatorOf(pc);
                  const blocked = hasSignedOrInitiated(pc, identityId);
                  return (
                    <tr key={pc.caseId} className={deepLink === pc.caseId ? 'bg-md-secondary-container/40' : ''}>
                      <td><span className="case-id">{pc.caseId}</span></td>
                      <td>{pc.accountHolderName || pc.beneficiaryId || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{fmtAmount(pc.amount)}</td>
                      <td><span className="meta-text">{pc.currentSignatures}/{pc.requiredSignatures || 1}</span></td>
                      <td><span className="meta-text">{initiator || '—'}</span></td>
                      <td>{paymentBadge(pc.status)}</td>
                      <td style={{ position: 'relative' }}>
                        <ActionMenuPortal
                          isOpen={activeMenu === pc.caseId}
                          onToggle={() => setActiveMenu(activeMenu === pc.caseId ? null : pc.caseId)}
                          onClose={() => setActiveMenu(null)}
                          actions={[
                            { label: 'View Details', onClick: () => setModal({ type: 'view', pc }) },
                            ...(blocked
                              ? []
                              : [{ label: 'Authorise Transfer', onClick: () => setModal({ type: 'authorise', pc }) }]),
                            { label: 'Reject Transfer', onClick: () => setModal({ type: 'reject', pc }) },
                          ]}
                        />
                        {blocked && (
                          <div className="payment-hint mt-1">
                            <Fingerprint size={12} /> You cannot authorise a transfer you initiated or previously signed.
                          </div>
                        )}
                      </td>
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

      <ViewDetailsModal pc={modal?.type === 'view' ? modal.pc : null} onClose={closeModal} />
      <AuthoriseTransferModal
        pc={modal?.type === 'authorise' ? modal.pc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
      <RejectTransferModal
        pc={modal?.type === 'reject' ? modal.pc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
    </div>
  );
}
