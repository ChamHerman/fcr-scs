import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, User, Activity, Wallet, Loader2, RefreshCw, FilePlus2, Undo2, Lock, Upload, Ban, CheckCircle2 } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { blockchainApi } from '../../services/blockchainApi';
import { paymentApi } from '../../services/paymentApi';
import { useWallet } from '../../hooks/useWallet';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useAdminIdentity } from '../../hooks/useAdminIdentity';
import { CaseIdCell } from '../../components/admin/CaseIdCell';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { WalletButton } from '../../components/ui/WalletButton';
import { ActionMenuPortal } from '../../components/ui/ActionMenuPortal';
import { NetworkSelector } from './NetworkSelector';
import type { NetworkInfo } from './NetworkSelector';
import '../LandAcquisition/case_management.css';
import '../Payment/payment.css';
import { BLOCKCHAIN_STATUSES } from '../Payment/statusMaps';
import {
  ViewLedgerModal,
  PublishModal,
  VoidModal,
  FOLLOW_UP_CHOICES,
  ledgerBadge,
  fmtTx,
  fmtDate,
  computeSettlementHash,
} from './blockchainModals';
import type { LedgerRow } from './blockchainModals';

type ModalState =
  | { type: 'view'; row: LedgerRow }
  | { type: 'publish'; row: LedgerRow }
  | { type: 'void'; row: LedgerRow }
  | null;

export const BlockchainDashboard: React.FC = () => {
  const { walletAddress, walletConnected, error: walletError, setError: setWalletError, connectWallet: handleConnectWallet } = useWallet();
  const { identityId } = useAdminIdentity();
  const { notify } = useNotification();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [records, setRecords] = useState<LedgerRow[]>([]);
  const [readyRows, setReadyRows] = useState<LedgerRow[]>([]);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [followUps, setFollowUps] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.stat-card', { opacity: 0, y: 28, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.1, ease: 'back.out(1.3)', delay: 0.1 });
    gsap.fromTo('.filter-bar, .action-bar, .table-wrap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.07, ease: 'power2.out', delay: 0.45 });
  }, { scope: containerRef });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [recData, netData] = await Promise.all([
        blockchainApi.getRecords(),
        blockchainApi.getNetworkInfo().catch(() => null),
      ]);
      const ledger: LedgerRow[] = (recData.records || []).map((r: any) => ({
        id: r.id,
        caseId: r.caseId,
        // The record id is the short FCR-XXXXXXXX id stored on publish
        publicId: r.id,
        transactionHash: r.transactionHash,
        documentHash: r.documentHash,
        status: r.status === 'Published' || r.status === 'PUBLISHED' ? 'Published' : 'Voided',
        voidReason: r.voidReason,
        voidTransactionHash: r.voidTransactionHash,
        publishedAt: r.publishedAt ?? r.createdAt,
        voidedAt: r.voidedAt,
        createdAt: r.createdAt,
        recordType: 'Original',
      }));

      // Derive "Ready to Publish" — payment Paid + no active ledger record (PLAN_HM_1308 §5.6).
      const paidRes = await paymentApi.getAllCases().catch(() => ({ cases: [] }));
      const paid = (paidRes.cases || []).filter((c: any) => c.status === 'Paid' || c.status === 'PAID');
      const existing = new Set(ledger.map((r) => r.caseId));
      const derived: LedgerRow[] = await Promise.all(
        paid
          .filter((c: any) => !existing.has(c.caseId))
          .map(async (c: any) => ({
            id: `ready-${c.caseId}`,
            caseId: c.caseId,
            // No FCR record exists yet — show the payment's PMT-XXXXXXXX id
            publicId: c.paymentId || c.id,
            status: 'Ready to Publish',
            beneficiary: c.accountHolderName || c.beneficiaryId,
            amount: c.amount,
            documentHash: await computeSettlementHash(c.caseId, c.amount),
            recordType: 'Original',
            certificateVersion: 1,
          }))
      );

      setRecords(ledger);
      setReadyRows(derived);
      setNetworkInfo(netData);
    } catch (err: any) {
      setError(err.message || 'Failed to load ledger data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allRows = useMemo(() => [...readyRows, ...records], [readyRows, records]);

  const stats = useMemo(() => {
    const ready = allRows.filter((r) => r.status === 'Ready to Publish').length;
    const published = allRows.filter((r) => r.status === 'Published').length;
    const voided = allRows.filter((r) => r.status === 'Voided').length;
    return [
      { label: 'Ready to Publish', value: ready, change: 'Derived from payment state', icon: Activity },
      { label: 'Published', value: published, change: 'On-chain', icon: Wallet },
      { label: 'Voided', value: voided, change: 'Voided on-chain', icon: Lock },
    ];
  }, [allRows]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allRows.filter((r) => {
      const mStatus = statusFilter === 'All' || r.status === statusFilter;
      const mSearch =
        !q ||
        (r.publicId ?? '').toLowerCase().includes(q) ||
        r.caseId.toLowerCase().includes(q) ||
        (r.transactionHash ?? '').toLowerCase().includes(q);
      return mStatus && mSearch;
    });
  }, [allRows, searchQuery, statusFilter]);

  const handleFollowUp = async (row: LedgerRow, key: string) => {
    const choice = FOLLOW_UP_CHOICES.find((c) => c.key === key);
    if (!choice) return;
    try {
      await blockchainApi.recordVoidFollowUp(row.caseId, identityId, key);
      setFollowUps((prev) => ({ ...prev, [row.caseId]: choice.label }));
      if (key === 'CREATE_CORRECTED_CERTIFICATE') {
        notify({ type: 'success', title: 'Corrected certificate queued', message: 'A corrected certificate is Ready to Publish (Replacement).' });
      } else if (key === 'REOPEN_PAYMENT') {
        notify({ type: 'success', title: 'Payment reopened', message: 'Settlement re-enters the payment flow (simulated).' });
      } else {
        notify({ type: 'general', title: 'Decision recorded', message: 'Kept voided — no further action.' });
      }
    } catch (e: any) {
      notify({ type: 'error', title: 'Action failed', message: e.message });
    }
  };

  const closeModal = () => setModal(null);

  const followUpIcons = {
    CREATE_CORRECTED_CERTIFICATE: FilePlus2,
    REOPEN_PAYMENT: Undo2,
    KEEP_VOIDED: CheckCircle2,
  } as const;

  return (
    <div className="main" ref={containerRef}>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Blockchain Overview</h1>
          <div className="sub">
            Full view of the ledger — publish, void and reconcile records.
          </div>
        </div>
        <div className="topbar-right flex items-center gap-3">
          <NetworkSelector networkInfo={networkInfo} onNetworkChange={(net) => setNetworkInfo(net)} />
          {walletConnected ? (
            <WalletButton walletAddress={walletAddress || undefined} label="Government Wallet" />
          ) : (
            <Button onClick={handleConnectWallet} variant="animated-primary" className="font-semibold flex items-center justify-center gap-2" style={{ minWidth: '180px' }}>
              <Wallet size={16} />
              Connect MetaMask
            </Button>
          )}
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
          <Button variant="text" size="sm" onClick={loadData}>Retry</Button>
        </div>
      )}
      {walletError && <p className="text-red-500 my-2">{walletError}</p>}

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
        <div className="search-wrap" style={{ flex: 1, minWidth: '300px' }}>
          <SearchInput placeholder="Search record/case ID, public ID or tx hash..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="filter-group">
          <Select
            label="Status"
            options={BLOCKCHAIN_STATUSES.map((s) => ({ value: s, label: s === 'All' ? 'All statuses' : s }))}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All statuses"
          />
          <Button variant="outlined" size="sm" onClick={() => { setStatusFilter('All'); setSearchQuery(''); }}>Clear</Button>
        </div>
      </div>

      <div className="action-bar">
        <div className="left">
          <Activity size={18} />
          <span className="count">Ledger activity ({filtered.length})</span>
        </div>
        <div className="right">
          <Button variant="tonal" size="sm" onClick={loadData}>
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Case</th>
                <th>Type</th>
                <th>Tx Hash</th>
                <th>Published Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-8">
                    <Loader2 size={22} className="inline animate-spin" /><span className="ml-2">Loading ledger records…</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-8">No ledger records match your filters.</td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="row-clickable" onClick={() => setModal({ type: 'view', row })}>
                    <td>
                      <span className="font-mono font-bold text-xs text-md-primary">
                        {row.publicId ?? row.caseId}
                      </span>
                    </td>
                    <td><CaseIdCell caseId={row.caseId} /></td>
                    <td>
                      <span className="meta-text">{row.recordType ?? 'Original'}</span>
                      {followUps[row.caseId] && (
                        <div className="payment-hint mt-1">{followUps[row.caseId]}</div>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--md-on-surface-variant)' }}>{fmtTx(row.transactionHash)}</td>
                    <td><span className="meta-text">{fmtDate(row.publishedAt ?? row.createdAt)}</span></td>
                    <td>{ledgerBadge(row.status)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        {(row.status === 'Ready to Publish' || row.status === 'READY_TO_PUBLISH') && (
                          <Button
                            size="sm"
                            variant="filled"
                            className="h-8 px-3.5 text-xs inline-flex items-center gap-2 rounded-full font-medium"
                            onClick={() => setModal({ type: 'publish', row })}
                          >
                            <Upload size={13} className="shrink-0" />
                            <span>Publish</span>
                          </Button>
                        )}
                        {(row.status === 'Published' || row.status === 'PUBLISHED') && (
                          <Button
                            size="sm"
                            variant="filled"
                            className="h-8 px-3.5 text-xs inline-flex items-center gap-2 rounded-full font-medium bg-red-600 hover:bg-red-700 text-white shadow-sm"
                            onClick={() => setModal({ type: 'void', row })}
                          >
                            <Ban size={13} className="shrink-0" />
                            <span>Void</span>
                          </Button>
                        )}
                        {row.status === 'Voided' && (
                          <ActionMenuPortal
                            isOpen={activeMenu === row.caseId}
                            onToggle={() => setActiveMenu(activeMenu === row.caseId ? null : row.caseId)}
                            onClose={() => setActiveMenu(null)}
                            actions={FOLLOW_UP_CHOICES.map((c) => ({
                              label: c.label,
                              onClick: () => handleFollowUp(row, c.key),
                            }))}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '24px', fontSize: '13px', color: 'var(--md-on-surface-variant)', opacity: 0.6, textAlign: 'center', borderTop: '1px solid rgba(121,116,126,0.08)', paddingTop: '18px' }}>
        FCR-SCS · Blockchain · Connected to Live Backend Data
      </div>

      <ViewLedgerModal row={modal?.type === 'view' ? modal.row : null} onClose={closeModal} />
      <PublishModal row={modal?.type === 'publish' ? modal.row : null} onClose={closeModal} onDone={() => { closeModal(); loadData(); }} />
      <VoidModal row={modal?.type === 'void' ? modal.row : null} onClose={closeModal} onDone={() => { closeModal(); loadData(); }} />
    </div>
  );
};
