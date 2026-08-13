import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, User, AlertOctagon, Loader2, FileWarning } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { paymentApi } from '../../services/paymentApi';
import { ActionMenuPortal } from '../../components/ui/ActionMenuPortal';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import '../LandAcquisition/case_management.css';
import './payment.css';
import {
  RetryPaymentModal,
  RequestDetailsUpdateModal,
  ScheduleTomorrowModal,
  paymentBadge,
  fmtAmount,
  fmtDate,
} from './paymentModals';
import type { PaymentRow } from './paymentModals';
import { normalizePaymentStatus } from './statusMaps';

type ModalState =
  | { type: 'error-log'; pc: PaymentRow }
  | { type: 'retry'; pc: PaymentRow }
  | { type: 'request-update'; pc: PaymentRow }
  | { type: 'schedule'; pc: PaymentRow }
  | null;

export default function FailedTransactions() {
  const [searchParams] = useSearchParams();
  const deepLink = searchParams.get('caseId');
  const [cases, setCases] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(deepLink || '');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.failed-header', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' });
    gsap.fromTo('.stats-grid, .filter-bar, .table-wrap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'back.out(1.2)', delay: 0.2 });
  }, { scope: pageRef });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await paymentApi.getFailedTransactions();
      setCases(res.cases || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load failed transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const failed = cases.filter((c) => normalizePaymentStatus(c.status) === 'Transfer Failed').length;
    const unresolved = cases.filter((c) => {
      const ft = c.failedTransactions ?? [];
      return ft.length === 0 || ft[ft.length - 1].resolution == null;
    }).length;
    return [
      { label: 'Failed', value: failed, change: 'Transfer Failed', icon: AlertOctagon },
      { label: 'Pending Resolution', value: unresolved, change: 'Needs SOP action', icon: FileWarning },
    ];
  }, [cases]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cases.filter((c) => !q || c.caseId.toLowerCase().includes(q) || (c.accountHolderName ?? '').toLowerCase().includes(q));
  }, [cases, searchQuery]);

  const closeModal = () => setModal(null);

  const selectedErrorLog = modal?.type === 'error-log' ? modal.pc : null;

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
          <span className="count">{filtered.length} failed {filtered.length === 1 ? 'transaction' : 'transactions'}</span>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Beneficiary</th>
                <th>Error</th>
                <th>Attempted At</th>
                <th>Resolution Status</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-8">
                    <Loader2 size={22} className="inline animate-spin" /><span className="ml-2">Loading failed transactions…</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-8">No failed transactions requiring resolution.</td>
                </tr>
              ) : (
                filtered.map((pc) => {
                  const ft = pc.failedTransactions ?? [];
                  // BUG FIX (PLAN_HM_1308 §3): read errorLog, not the non-existent `.reason`.
                  const latest = ft[ft.length - 1];
                  const errorLog = latest?.errorLog || 'No error log available.';
                  const unresolved = !latest?.resolution;
                  return (
                    <tr key={pc.caseId} className={deepLink === pc.caseId ? 'bg-md-secondary-container/40' : ''}>
                      <td><span className="case-id">{pc.caseId}</span></td>
                      <td>{pc.accountHolderName || pc.beneficiaryId || '—'}</td>
                      <td>
                        <span className="meta-text" style={{ display: 'block', maxWidth: 280 }}>
                          {errorLog.length > 70 ? `${errorLog.slice(0, 70)}…` : errorLog}
                        </span>
                      </td>
                      <td><span className="meta-text">{latest ? fmtDate(latest.createdAt) : fmtDate(pc.updatedAt)}</span></td>
                      <td>
                        {unresolved ? (
                          <span className="payment-badge pending"><span className="dot" />Pending resolution</span>
                        ) : (
                          <span className="payment-badge approved"><span className="dot" />Resolved</span>
                        )}
                      </td>
                      <td>{paymentBadge(pc.status)}</td>
                      <td style={{ position: 'relative' }}>
                        <ActionMenuPortal
                          isOpen={activeMenu === pc.caseId}
                          onToggle={() => setActiveMenu(activeMenu === pc.caseId ? null : pc.caseId)}
                          onClose={() => setActiveMenu(null)}
                          actions={[
                            { label: 'View Error Logs', onClick: () => setModal({ type: 'error-log', pc }) },
                            { label: 'Retry Payment', onClick: () => setModal({ type: 'retry', pc }) },
                            { label: 'Request Details Update', onClick: () => setModal({ type: 'request-update', pc }) },
                            { label: 'Schedule Tomorrow', onClick: () => setModal({ type: 'schedule', pc }) },
                          ]}
                        />
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
        FCR-SCS · Payments · Failed Transactions · Connected to Live Backend Data
      </div>

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
                    <div className="text-sm text-md-on-surface break-words whitespace-pre-wrap">{f.errorLog}</div>
                    {f.resolution && (
                      <div className="text-xs text-md-on-success mt-1">
                        Resolution: {f.resolution} {f.resolvedAt ? `· ${fmtDate(f.resolvedAt)}` : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

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
    </div>
  );
}
