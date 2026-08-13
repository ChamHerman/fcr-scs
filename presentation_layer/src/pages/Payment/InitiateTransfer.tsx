import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, User, CheckCircle2, Loader2, Eye, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { paymentApi } from '../../services/paymentApi';
import { ActionMenuPortal } from '../../components/ui/ActionMenuPortal';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import '../LandAcquisition/case_management.css';
import './payment.css';
import {
  ViewDetailsModal,
  InitiateTransferModal,
  paymentBadge,
  fmtAmount,
  fmtDate,
  maskAccount,
  hasBankDetails,
  isReadyToInitiate,
} from './paymentModals';
import type { PaymentRow } from './paymentModals';

type ModalState = { type: 'view'; pc: PaymentRow } | { type: 'initiate'; pc: PaymentRow } | null;

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
    () => cases.filter((c) => (c.status === 'Approved' || c.status === 'Bank Details Submitted') && !hasBankDetails(c)),
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
          <div className="sub">Queue of eligible cases ready for initiation — eligible = status Approved/Bank Details Submitted with verified bank details.</div>
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
          <select value={bankFilter} onChange={(e) => setBankFilter(e.target.value)}>
            {banks.map((b) => <option key={b}>{b}</option>)}
          </select>
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
                <th>Case ID</th>
                <th>Beneficiary</th>
                <th>Bank</th>
                <th>Amount</th>
                <th>Bank Status</th>
                <th>Actions</th>
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
                filtered.map((pc) => (
                  <tr key={pc.caseId} className={deepLink === pc.caseId ? 'bg-md-secondary-container/40' : ''}>
                    <td><span className="case-id">{pc.caseId}</span></td>
                    <td>{pc.accountHolderName || pc.beneficiaryId || '—'}</td>
                    <td>{pc.bankName ? `${pc.bankName} ${maskAccount(pc.accountNumber)}` : '—'}</td>
                    <td style={{ fontWeight: 600 }}>{fmtAmount(pc.amount)}</td>
                    <td>
                      <span className="payment-badge approved"><span className="dot" />Verified</span>
                    </td>
                    <td style={{ position: 'relative' }}>
                      <ActionMenuPortal
                        isOpen={activeMenu === pc.caseId}
                        onToggle={() => setActiveMenu(activeMenu === pc.caseId ? null : pc.caseId)}
                        onClose={() => setActiveMenu(null)}
                        actions={[
                          { label: 'View Details', onClick: () => setModal({ type: 'view', pc }) },
                          { label: 'Initiate Transfer', onClick: () => setModal({ type: 'initiate', pc }) },
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '24px', fontSize: '13px', color: 'var(--md-on-surface-variant)', opacity: 0.6, textAlign: 'center', borderTop: '1px solid rgba(121,116,126,0.08)', paddingTop: '18px' }}>
        FCR-SCS · Payments · Initiate · Connected to Live Backend Data
      </div>

      <ViewDetailsModal pc={modal?.type === 'view' ? modal.pc : null} onClose={closeModal} />
      <InitiateTransferModal
        pc={modal?.type === 'initiate' ? modal.pc : null}
        onClose={closeModal}
        onDone={() => { closeModal(); loadData(); }}
      />
    </div>
  );
}
