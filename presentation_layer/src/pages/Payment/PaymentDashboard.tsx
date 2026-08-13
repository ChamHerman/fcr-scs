import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, DollarSign, User, XCircle, Hourglass, Loader2, Eye } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { paymentApi } from '../../services/paymentApi';
import { ActionMenuPortal } from '../../components/ui/ActionMenuPortal';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useNotification } from '../../components/ui/NotificationSystem';
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
  downloadReceipt,
  paymentBadge,
  fmtAmount,
  fmtDate,
  maskAccount,
  hasBankDetails,
  hasSignedOrInitiated,
} from './paymentModals';
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
  const [appliedFilter, setAppliedFilter] = useState('All');
  const [allCases, setAllCases] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { identityId } = useAdminIdentity();
  const { notify } = useNotification();
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.stat-card', { opacity: 0, y: 28, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.1, ease: 'back.out(1.3)', delay: 0.1 });
    gsap.fromTo('.filter-bar, .action-bar, .table-wrap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.07, ease: 'power2.out', delay: 0.45 });
  }, { scope: containerRef });

  const loadData = useCallback(async (preservePage = true) => {
    setLoading(true);
    setError('');
    try {
      const allRes = await paymentApi.getAllCases();
      setAllCases(allRes.cases || []);
      if (!preservePage) setCurrentPage(1);
    } catch (err: any) {
      setError(err.message || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const pending = allCases.filter((c) => c.status === 'Transfer Initiated').length;
    const failed = allCases.filter((c) => normalizePaymentStatus(c.status) === 'Transfer Failed').length;
    const paid = allCases.filter((c) => c.status === 'Paid').length;
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
      const matchesStatus = appliedFilter === 'All' || c.status === appliedFilter;
      const matchesSearch =
        !q ||
        c.caseId.toLowerCase().includes(q) ||
        (c.accountHolderName ?? '').toLowerCase().includes(q) ||
        (c.bankName ?? '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [allCases, searchQuery, appliedFilter]);

  const totalCount = filteredCases.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, pageCount);
  const pageRows = filteredCases.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const buildMenu = (pc: PaymentRow) => {
    const items: { label: string; onClick: () => void }[] = [];
    items.push({ label: 'View Details', onClick: () => setModal({ type: 'view', pc }) });

    if (pc.status === 'Approved' || pc.status === 'Bank Details Submitted') {
      if (hasBankDetails(pc)) {
        items.push({ label: 'Initiate Transfer', onClick: () => setModal({ type: 'initiate', pc }) });
      }
    }

    if (pc.status === 'Transfer Initiated') {
      if (!hasSignedOrInitiated(pc, identityId)) {
        items.push({ label: 'Authorise Transfer', onClick: () => setModal({ type: 'authorise', pc }) });
      }
      items.push({ label: 'Reject Transfer', onClick: () => setModal({ type: 'reject', pc }) });
    }

    if (normalizePaymentStatus(pc.status) === 'Transfer Failed') {
      items.push({ label: 'Retry Payment', onClick: () => setModal({ type: 'retry', pc }) });
      items.push({ label: 'Request Details Update', onClick: () => setModal({ type: 'request-update', pc }) });
      items.push({ label: 'Schedule Tomorrow', onClick: () => setModal({ type: 'schedule', pc }) });
    }

    if (pc.status === 'Paid') {
      items.push({ label: 'Download Receipt', onClick: () => downloadReceipt(pc, notify) });
    }

    if (['Approved', 'Bank Details Submitted', 'Transfer Initiated', 'Authorised', 'Scheduled'].includes(pc.status)) {
      items.push({ label: 'Cancel Payment', onClick: () => setModal({ type: 'cancel', pc }) });
    }

    if (pc.status === 'Payment Disputed') {
      items.push({ label: 'Mark Resolved', onClick: () => setModal({ type: 'resolve-dispute', pc }) });
    }

    return items;
  };

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
            onChange={setStatusFilter}
            placeholder="All statuses"
          />
          <Button
            variant="filled"
            size="sm"
            onClick={() => {
              setAppliedFilter(statusFilter);
              setCurrentPage(1);
            }}
          >
            Apply
          </Button>
          <Button
            variant="outlined"
            size="sm"
            onClick={() => {
              setStatusFilter('All');
              setAppliedFilter('All');
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
                  <td colSpan={8} className="text-center text-gray-500 py-8">
                    <Loader2 size={22} className="inline animate-spin" />
                    <span className="ml-2">Loading payment records…</span>
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-gray-500 py-8">
                    {error ? 'Failed to load data.' : 'No payment records match your filters.'}
                  </td>
                </tr>
              ) : (
                pageRows.map((pc) => {
                  const needsBank = !hasBankDetails(pc);
                  return (
                    <tr key={pc.caseId}>
                      <td><span className="case-id">{pc.caseId}</span></td>
                      <td>{pc.accountHolderName || pc.beneficiaryId || '—'}</td>
                      <td>
                        {pc.bankName ? `${pc.bankName} ${maskAccount(pc.accountNumber)}` : '—'}
                        {needsBank && (pc.status === 'Approved' || pc.status === 'Bank Details Submitted') && (
                          <div className="payment-hint mt-1">
                            <Eye size={12} /> Awaiting beneficiary bank details
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>{fmtAmount(pc.amount)}</td>
                      <td><span className="meta-text">{fmtDate(pc.updatedAt || pc.createdAt)}</span></td>
                      <td><span className="meta-text">{pc.currentSignatures}/{pc.requiredSignatures || 1}</span></td>
                      <td>{paymentBadge(pc.status)}</td>
                      <td style={{ position: 'relative' }}>
                        <ActionMenuPortal
                          isOpen={activeMenu === pc.caseId}
                          onToggle={() => setActiveMenu(activeMenu === pc.caseId ? null : pc.caseId)}
                          onClose={() => setActiveMenu(null)}
                          actions={buildMenu(pc)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalCount > ITEMS_PER_PAGE && (
          <div className="pagination">
            <div className="info">
              Showing <strong>{(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, totalCount)}</strong> of <strong>{totalCount}</strong> records
            </div>
            <div className="pages">
              <button disabled={safePage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>‹</button>
              <button className="active">{safePage}</button>
              <button disabled={safePage * ITEMS_PER_PAGE >= totalCount} onClick={() => setCurrentPage((p) => p + 1)}>›</button>
            </div>
          </div>
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
        onDone={() => { closeModal(); loadData(); }}
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
