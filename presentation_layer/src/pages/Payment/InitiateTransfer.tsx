import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, User, CheckCircle2, Loader2, Eye, ShieldAlert } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { paymentApi } from '../../services/paymentApi';
import { CaseIdCell } from '../../components/admin/CaseIdCell';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { CopyButton } from '../../components/ui/CopyButton';
import { useAdminIdentity } from '../../hooks/useAdminIdentity';
import { useAuth } from '../../context/AuthContext';
import '../LandAcquisition/case_management.css';
import './payment.css';
import {
  ViewDetailsModal,
  InitiateTransferModal,
  CancelPaymentModal,
  paymentBadge,
  fmtAmount,
  maskAccount,
  hasBankDetails,
  isReadyToInitiate,
} from './paymentModals';
import { CaseDetailsModal } from './CaseDetailsModal';
import { PaymentRowActions } from './PaymentRowActions';
import { normalizePaymentStatus } from './statusMaps';
import type { PaymentRow } from './paymentModals';

type ModalState =
  | { type: 'view'; pc: PaymentRow }
  | { type: 'initiate'; pc: PaymentRow }
  | { type: 'cancel'; pc: PaymentRow }
  | null;

export default function InitiateTransfer() {
  const [searchParams] = useSearchParams();
  const deepLink = searchParams.get('caseId');
  const [cases, setCases] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(deepLink || '');
  const [bankFilter, setBankFilter] = useState('All banks');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [caseDetailsId, setCaseDetailsId] = useState<string | null>(null);
  const { identityId } = useAdminIdentity();
  const { user } = useAuth();
  const pageRef = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    gsap.fromTo('.initiate-header', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' });
    gsap.fromTo('.stats-grid, .filter-bar, .table-wrap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'back.out(1.2)', delay: 0.2 });
  }, { scope: pageRef });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await paymentApi.getAllCases();
      setCases(res.cases || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const eligible = useMemo(() => cases.filter(isReadyToInitiate), [cases]);
  const awaitingBank = useMemo(
    () =>
      cases.filter(
        (c) => ['Offer Accepted', 'Bank Details Submitted'].includes(normalizePaymentStatus(c.status)) && !hasBankDetails(c)
      ),
    [cases]
  );

  const stats = [
    { label: 'Eligible to Initiate', value: eligible.length, change: 'Ready now', icon: CheckCircle2 },
    { label: 'Awaiting Bank Details', value: awaitingBank.length, change: 'Blocked (UC-PMT-002 A1)', icon: Eye },
  ];

  const banks = useMemo(() => {
    const set = new Set<string>();
    eligible.forEach((c) => c.bankName && set.add(c.bankName));
    return ['All banks', ...Array.from(set)];
  }, [eligible]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return eligible.filter((c) => {
      const mBank = bankFilter === 'All banks' || c.bankName === bankFilter;
      const mSearch =
        !q || c.caseId.toLowerCase().includes(q) || (c.accountHolderName ?? '').toLowerCase().includes(q);
      return mBank && mSearch;
    });
  }, [eligible, searchQuery, bankFilter]);

  const closeModal = () => setModal(null);

  return (
    <div className="main" ref={pageRef}>
      <div className="topbar initiate-header">
        <div className="topbar-left">
          <h1>Initiate Transfer</h1>
          <div className="sub">Queue of eligible cases ready for initiation — eligible = status Offer Accepted / Bank Details Submitted with valid bank details.</div>
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
          <Select
            label="Bank"
            options={banks.map((b) => ({ value: b, label: b }))}
            value={bankFilter}
            onChange={setBankFilter}
            placeholder="All banks"
          />
          <Button variant="outlined" size="sm" onClick={() => { setSearchQuery(''); setBankFilter('All banks'); }}>Clear</Button>
        </div>
      </div>

      <div className="action-bar">
        <div className="left">
          <span className="count">{filtered.length} eligible {filtered.length === 1 ? 'case' : 'cases'}</span>
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
                <th style={{ width: '180px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">
                    <Loader2 size={22} className="inline animate-spin" /><span className="ml-2">Loading eligible cases…</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">No cases eligible to initiate right now.</td>
                </tr>
              ) : (
                filtered.map((pc) => {
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
                      <td>
                        {pc.bankName && pc.accountNumber ? (
                          <div className="flex items-center gap-1.5">
                            <span>{pc.bankName}</span>
                            <span className="font-mono text-xs text-md-on-surface-variant">{maskAccount(pc.accountNumber)}</span>
                            <CopyButton value={pc.accountNumber} title="Copy Account Number" />
                          </div>
                        ) : pc.bankName ? (
                          pc.bankName
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="font-semibold">{fmtAmount(pc.amount)}</td>
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
        FCR-SCS · Payments · Initiate · Connected to Live Backend Data
      </div>

      <CaseDetailsModal
        caseId={caseDetailsId}
        onClose={() => setCaseDetailsId(null)}
      />
      <ViewDetailsModal
        pc={modal?.type === 'view' ? modal.pc : null}
        identityId={identityId}
        onClose={closeModal}
        onAction={(type, target) => setModal({ type, pc: target } as ModalState)}
      />
      <InitiateTransferModal
        pc={modal?.type === 'initiate' ? modal.pc : null}
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
