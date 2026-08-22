import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, DollarSign, User, XCircle, Hourglass, Loader2, Eye } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { paymentApi } from '../../services/paymentApi';
import { CaseIdCell } from '../../components/admin/CaseIdCell';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { useAdminIdentity } from '../../hooks/useAdminIdentity';
import '../LandAcquisition/case_management.css';
import './payment.css';
import {
  PAYMENT_STATUSES,
  normalizePaymentStatus,
} from './statusMaps';
import {
  ViewDetailsModal,
  InitiateTransferModal,
  AuthoriseTransferModal,
  RejectTransferModal,
  CancelPaymentModal,
  RetryPaymentModal,
  RequestDetailsUpdateModal,
  ScheduleTomorrowModal,
  ResolveDisputeModal,
  paymentBadge,
  fmtAmount,
  fmtDate,
  maskAccount,
  hasBankDetails,
} from './paymentModals';
import { PaymentRowActions } from './PaymentRowActions';
import type { PaymentRow } from './paymentModals';

type ModalState =
  | { type: 'view'; pc: PaymentRow }
  | { type: 'initiate'; pc: PaymentRow }
  | { type: 'authorise'; pc: PaymentRow }
  | { type: 'reject'; pc: PaymentRow }
  | { type: 'cancel'; pc: PaymentRow }
  | { type: 'retry'; pc: PaymentRow }
  | { type: 'request-update'; pc: PaymentRow }
  | { type: 'schedule'; pc: PaymentRow }
  | { type: 'resolve-dispute'; pc: PaymentRow }
  | null;

const ITEMS_PER_PAGE = 10;

export default function PaymentDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [allCases, setAllCases] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { identityId } = useAdminIdentity();
  const containerRef = useRef<HTMLDivElement>(null);

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
    const failed = allCases.filter((c) => normalizePaymentStatus(c.status) === 'Transfer Failed').length;
    const paid = allCases.filter((c) => normalizePaymentStatus(c.status) === 'Paid').length;
    return [
      { label: 'Total Payment Cases', value: allCases.length, change: 'All records', icon: DollarSign },
      { label: 'Pending Authorisations', value: pending, change: 'Requires Action', icon: Hourglass },
      { label: 'Failed Transfers', value: failed, change: 'Requires Attention', icon: XCircle },
      { label: 'Paid', value: paid, change: 'Executed', icon: Clock },
    ];
  }, [allCases]);

  const filteredCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allCases.filter((c) => {
      const matchesStatus = statusFilter === 'All' || normalizePaymentStatus(c.status) === statusFilter;
      const matchesSearch =
        !q ||
        c.caseId.toLowerCase().includes(q) ||
        (c.accountHolderName ?? '').toLowerCase().includes(q) ||
        (c.bankName ?? '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [allCases, searchQuery, statusFilter]);

  const totalCount = filteredCases.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, pageCount);
  const pageRows = filteredCases.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

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
            label="Status"
            options={PAYMENT_STATUSES.map((s) => ({ value: s, label: s === 'All' ? 'All statuses' : s }))}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setCurrentPage(1);
            }}
            placeholder="All statuses"
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
                <th>Payment ID</th>
                <th>Case ID</th>
                <th>Beneficiary</th>
                <th>Bank</th>
                <th>Amount</th>
                <th>Date &amp; Time</th>
                <th>Approval</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center text-gray-500 py-8">
                    <Loader2 size={22} className="inline animate-spin" />
                    <span className="ml-2">Loading payment records…</span>
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-gray-500 py-8">
                    {error ? 'Failed to load data.' : 'No payment records match your filters.'}
                  </td>
                </tr>
              ) : (
                pageRows.map((pc) => {
                  const needsBank = !hasBankDetails(pc);
                  const openView = () => setModal({ type: 'view', pc });
                  const paymentId = pc.paymentId || `PMT-${pc.caseId}`;
                  return (
                    <tr key={pc.caseId} className="row-clickable" onClick={openView}>
                      <td>
                        <span className="font-mono font-bold text-xs text-md-primary">
                          {paymentId}
                        </span>
                      </td>
                      <td><CaseIdCell caseId={pc.caseId} /></td>
                      <td>{pc.accountHolderName || pc.beneficiaryId || '—'}</td>
                      <td>
                        {pc.bankName ? `${pc.bankName} ${maskAccount(pc.accountNumber)}` : '—'}
                        {needsBank && ['Offer Accepted', 'Bank Details Submitted'].includes(normalizePaymentStatus(pc.status)) && (
                          <div className="payment-hint mt-1">
                            <Eye size={12} /> Awaiting beneficiary bank details
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>{fmtAmount(pc.amount)}</td>
                      <td><span className="meta-text">{fmtDate(pc.updatedAt || pc.createdAt)}</span></td>
                      <td><span className="meta-text">{pc.currentSignatures}/{pc.requiredSignatures || 1}</span></td>
                      <td>{paymentBadge(pc.status)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <PaymentRowActions
                          pc={pc}
                          identityId={identityId}
                          onAction={(type, target) => setModal({ type, pc: target } as ModalState)}
                          activeMenu={activeMenu}
                          setActiveMenu={setActiveMenu}
                        />
                      </td>
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
      <ViewDetailsModal pc={modal?.type === 'view' ? modal.pc : null} onClose={closeModal} />
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
          // The backend auto-submits AUTHORISED → WAITING_BANK_APPROVAL after
          // 5s; refresh once more so the status flip is visible in the list.
          setTimeout(() => loadData(true, true), 5500);
        }}
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
