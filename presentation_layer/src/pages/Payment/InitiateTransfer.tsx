import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, User, CheckCircle2, Loader2, Eye, ShieldAlert, Lock, RefreshCw, Activity, Send } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
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
import { PageHeader } from '../../components/ui/PageHeader';
import '../LandAcquisition/case_management.css';
import { RefreshButton } from './RefreshButton';
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
  | { type: 'view'; caseId: string }
  | { type: 'initiate'; caseId: string }
  | { type: 'cancel'; caseId: string }
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
    gsap.fromTo('.stats-grid, .filter-bar, .action-bar, .table-wrap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'back.out(1.2)', delay: 0.2 });
  }, { scope: pageRef });

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await paymentApi.getAllCases();
      const rawCases = res.cases || [];
      const eligible = rawCases.filter((c: any) => {
        const raw = (c.caseStatus || '').toUpperCase().replace(/\s+/g, '_');
        return raw !== 'OFFER_ISSUED' && raw !== 'OFFER_REJECTED' && raw !== 'CASE_REGISTERED' && c.status !== 'Offer Issued';
      });
      setCases(eligible);
    } catch (err: any) {
      setError(err.message || 'Failed to load cases');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const normalizeStatusKey = (s?: string) =>
    (s || '').toUpperCase().replace(/&/g, 'AND').replace(/\s+/g, '_');

  const isInInitiationQueue = (c: PaymentRow) => {
    const raw = (c.caseStatus || '').toUpperCase().replace(/\s+/g, '_');
    if (raw === 'OFFER_ISSUED' || raw === 'OFFER_REJECTED' || raw === 'CASE_REGISTERED' || c.status === 'Offer Issued') {
      return false;
    }
    const k = normalizeStatusKey(c.status);
    return (
      k === 'READY_TO_INITIATE' ||
      k === 'AWARD_NOTARIZATION_PENDING' ||
      k === 'BANK_DETAILS_AND_M1_PENDING' ||
      k === 'NEW_BANK_DETAILS_PENDING' ||
      k === 'BANK_DETAILS_PENDING'
    );
  };

  const INITIATION_STATUS_RANK: Record<string, number> = {
    'READY_TO_INITIATE': 1,
    'AWARD_NOTARIZATION_PENDING': 2,
    'BANK_DETAILS_AND_M1_PENDING': 3,
    'NEW_BANK_DETAILS_PENDING': 4,
    'BANK_DETAILS_PENDING': 5,
  };

  const queueCases = useMemo(() => {
    const filtered = cases.filter(isInInitiationQueue);
    return filtered.sort((a, b) => {
      const ka = normalizeStatusKey(a.status);
      const kb = normalizeStatusKey(b.status);
      const rankA = INITIATION_STATUS_RANK[ka] ?? 99;
      const rankB = INITIATION_STATUS_RANK[kb] ?? 99;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      // Secondary sort: Payment ID using natural numerical ordering
      const pmtA = a.paymentId || a.id || '';
      const pmtB = b.paymentId || b.id || '';
      const pmtCmp = pmtA.localeCompare(pmtB, undefined, { numeric: true, sensitivity: 'base' });
      if (pmtCmp !== 0) return pmtCmp;
      // Oldest updated/created at the top
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeA - timeB;
    });
  }, [cases]);

  const readyCases = useMemo(
    () => cases.filter((c) => normalizeStatusKey(c.status) === 'READY_TO_INITIATE'),
    [cases]
  );
  const pendingBankCases = useMemo(
    () => cases.filter((c) => normalizeStatusKey(c.status) === 'BANK_DETAILS_PENDING'),
    [cases]
  );
  const awardNotarizationPendingCases = useMemo(
    () => cases.filter((c) => normalizeStatusKey(c.status) === 'AWARD_NOTARIZATION_PENDING'),
    [cases]
  );
  const bothPendingCases = useMemo(
    () => cases.filter((c) => normalizeStatusKey(c.status) === 'BANK_DETAILS_AND_M1_PENDING'),
    [cases]
  );

  const stats = [
    { label: 'Ready to Initiate', value: readyCases.length, icon: CheckCircle2, iconColor: 'text-emerald-600' },
    { label: 'Bank Details Pending', value: pendingBankCases.length, icon: Clock, iconColor: 'text-amber-600' },
    { label: 'Award Notarization Pending', value: awardNotarizationPendingCases.length, icon: ShieldAlert, iconColor: 'text-indigo-600' },
    { label: 'Bank Details & M1 Pending', value: bothPendingCases.length, icon: RefreshCw, iconColor: 'text-slate-600' },
  ];

  const banks = useMemo(() => {
    const set = new Set<string>();
    queueCases.forEach((c) => c.bankName && set.add(c.bankName));
    return ['All banks', ...Array.from(set)];
  }, [queueCases]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return queueCases.filter((c) => {
      const mBank = bankFilter === 'All banks' || c.bankName === bankFilter;
      const mSearch =
        !q ||
        c.caseId.toLowerCase().includes(q) ||
        (c.accountHolderName ?? '').toLowerCase().includes(q) ||
        (c.paymentId ?? '').toLowerCase().includes(q);
      return mBank && mSearch;
    });
  }, [queueCases, searchQuery, bankFilter]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, bankFilter]);

  useEffect(() => {
    if (bankFilter !== 'All banks' && !banks.includes(bankFilter)) {
      setBankFilter('All banks');
    }
  }, [banks, bankFilter]);

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

  return (
    <div className="main" ref={pageRef}>
      <PageHeader
        title="Initiate Transfer"
        subtitle="Queue of eligible cases ready for initiation — requires valid bank details and published Milestone 1 (Statutory Award) notarization."
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
          <Send size={18} />
          <span className="count">Initiation queue ({filtered.length})</span>
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
                <th style={{ width: '180px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">
                    <Loader2 size={22} className="inline animate-spin" /><span className="ml-2">Loading queue cases…</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">No payment records currently in the initiation queue.</td>
                </tr>
              ) : (
                pageRows.map((pc) => {
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

      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemLabel="eligible cases"
      />

      <div style={{ height: '32px' }} />

      <CaseDetailsModal
        caseId={caseDetailsId}
        onClose={() => setCaseDetailsId(null)}
      />
      <ViewDetailsModal
        pc={modal?.type === 'view' ? modalPc : null}
        identityId={identityId}
        onClose={closeModal}
        onAction={(type, target) => {
          if (type === 'confirm-execution' || type === 'confirm-receipt') return;
          openModal(type as Exclude<ModalState, null>['type'], target.caseId);
        }}
      />
      <InitiateTransferModal
        pc={modal?.type === 'initiate' ? modalPc : null}
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
