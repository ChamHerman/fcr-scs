import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, User, Activity, Wallet, Loader2, RefreshCw, FilePlus2, Undo2, Lock, Upload, Ban, CheckCircle2, Folder } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { blockchainApi } from '../../services/blockchainApi';
import { paymentApi } from '../../services/paymentApi';
import { compensationApi } from '../../services/compensationApi';
import { useWallet } from '../../hooks/useWallet';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useAdminIdentity } from '../../hooks/useAdminIdentity';
import { CaseIdCell } from '../../components/admin/CaseIdCell';
import { CaseDetailsModal } from '../Payment/CaseDetailsModal';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { CopyButton } from '../../components/ui/CopyButton';
import { WalletButton } from '../../components/ui/WalletButton';
import { ActionMenuPortal } from '../../components/ui/ActionMenuPortal';
import { NetworkStatusBadge } from './NetworkSelector';
import type { NetworkInfo } from './NetworkSelector';
import { RefreshButton } from '../Payment/RefreshButton';
import { Pagination } from '../../components/ui/Pagination';
import { formatGraceCountdown } from './PublishLedger';
import '../LandAcquisition/case_management.css';
import '../Payment/payment.css';
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
  const [caseDetailsId, setCaseDetailsId] = useState<string | null>(null);
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
      const [recData, netData, paidRes, offersRes] = await Promise.all([
        blockchainApi.getRecords(),
        blockchainApi.getNetworkInfo().catch(() => null),
        paymentApi.getAllCases().catch(() => ({ cases: [] })),
        compensationApi
          .getAllOfferLetters({ status: 'ACCEPTED', limit: 200 } as any)
          .catch(() => ({ offers: [], offerLetters: [] })),
      ]);
      const paidMap = new Map((paidRes.cases || []).map((c: any) => [c.caseId, c]));
      const offersList: any[] = offersRes.offers || offersRes.offerLetters || [];
      const offerMap = new Map(offersList.map((o: any) => [o.caseId, o]));

      const ledger: LedgerRow[] = (recData.records || []).map((r: any) => {
        const pmt: any = paidMap.get(r.caseId);
        const off: any = offerMap.get(r.caseId);
        const ben = r.beneficiary || pmt?.beneficiary || pmt?.accountHolderName || off?.landOwnership?.landOwner?.name;
        const amt = r.amount || pmt?.amount || off?.offerAmount;
        return {
          id: r.id,
          caseId: r.caseId,
          // The record id is the canonical BCN-YYYY-MM-#### stored on publish
          publicId: r.id,
          milestone: (r.milestone ?? 'AWARD') === 'AWARD' ? ('M1' as const) : ('M2' as const),
          onChainKey: r.onChainKey || `${r.caseId}#${(r.milestone ?? 'AWARD') === 'AWARD' ? 'M1' : 'M2'}`,
          transactionHash: r.transactionHash,
          documentHash: r.documentHash,
          beneficiary: ben,
          amount: amt,
          status:
            r.status === 'Published' || r.status === 'PUBLISHED'
              ? 'Published'
              : r.status === 'Void Pending' || r.status === 'VOID_PENDING'
              ? 'Void Pending'
              : 'Voided',
          voidReason: r.voidReason,
          voidTransactionHash: r.voidTransactionHash,
          publishedAt: r.publishedAt ?? r.createdAt,
          voidedAt: r.voidedAt,
          createdAt: r.createdAt,
          recordType: 'Original',
        };
      });

      // FR-019 dual-milestone "Ready to Publish" derivation:
      //   M1 (Award)  — accepted offers past the 24-hour grace window, Form H
      //                 hash frozen, with no M1 record on the ledger yet.
      //   M2 (Settlement) — Paid payment cases whose receipt hash has no M2
      //                 record on the ledger yet.
      const ACCEPTANCE_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
      const now = Date.now();
      const m1Published = new Set(
        ledger.filter((r) => r.milestone === 'M1').map((r) => r.caseId)
      );
      const m2Published = new Set(
        ledger.filter((r) => r.milestone === 'M2').map((r) => r.caseId)
      );

      const nowYear = new Date().getFullYear();
      const nowMonth = String(new Date().getMonth() + 1).padStart(2, '0');
      const bcnPrefix = `BCN-${nowYear}-${nowMonth}-`;

      let maxSeq = 0;
      ledger.forEach((r) => {
        const idToCheck = r.publicId || r.id || '';
        if (idToCheck.startsWith(bcnPrefix)) {
          const parts = idToCheck.split('-');
          const num = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      });

      let currentSeq = maxSeq;

      const offers: any[] = offersRes.offers || offersRes.offerLetters || [];
      const awardOffers = offers
        .filter((o) => {
          if (!o.caseId || m1Published.has(o.caseId)) return false;
          return Boolean(o.acceptedAt);
        })
        .sort((a, b) => (a.caseId || '').localeCompare(b.caseId || ''));

      const awardReady: LedgerRow[] = awardOffers.map((o) => {
        currentSeq += 1;
        const bcnId = `${bcnPrefix}${String(currentSeq).padStart(4, '0')}`;
        const acceptedAtMs = o.acceptedAt ? new Date(o.acceptedAt).getTime() : null;
        const graceEndsAtMs = acceptedAtMs != null ? acceptedAtMs + ACCEPTANCE_GRACE_PERIOD_MS : null;
        const graceLocked = graceEndsAtMs != null && now < graceEndsAtMs;
        return {
          id: bcnId,
          publicId: bcnId,
          caseId: o.caseId,
          milestone: 'M1' as const,
          onChainKey: `${o.caseId}#M1`,
          status: graceLocked ? 'Grace Period (Locked)' : 'Ready to Publish',
          beneficiary: o.landOwnership?.landOwner?.name,
          amount: o.offerAmount,
          documentHash: o.blockchainHash || null,
          recordType: 'Original' as const,
          publishedAt: null,
          graceEndsAt: graceEndsAtMs,
          acceptedAt: o.acceptedAt || null,
        };
      });

      const paid = (paidRes.cases || [])
        .filter((c: any) => c.status === 'Paid' || c.status === 'PAID')
        .sort((a: any, b: any) => (a.caseId || '').localeCompare(b.caseId || ''));

      const settlementReady: LedgerRow[] = await Promise.all(
        paid
          .filter((c: any) => !m2Published.has(c.caseId))
          .map(async (c: any) => {
            currentSeq += 1;
            const bcnId = `${bcnPrefix}${String(currentSeq).padStart(4, '0')}`;
            return {
              id: bcnId,
              publicId: bcnId,
              caseId: c.caseId,
              milestone: 'M2' as const,
              onChainKey: `${c.caseId}#M2`,
              status: 'Ready to Publish',
              documentHash: c.receipt?.documentHash || (await computeSettlementHash(c.caseId, c.amount)),
              certificateVersion: 1,
              beneficiary: c.accountHolderName || c.beneficiaryId,
              amount: c.amount,
              recordType: 'Original' as const,
              publishedAt: null,
            };
          })
      );

      setRecords(ledger);
      setReadyRows([...awardReady, ...settlementReady]);
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

  // Dynamically derive available statuses strictly from loaded records
  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    allRows.forEach((r) => {
      if (r.status) set.add(r.status);
    });
    return ['All', ...Array.from(set).sort()];
  }, [allRows]);

  useEffect(() => {
    if (statusFilter !== 'All' && !availableStatuses.includes(statusFilter)) {
      setStatusFilter('All');
    }
  }, [availableStatuses, statusFilter]);

  const stats = useMemo(() => {
    const readyM1 = allRows.filter((r) => r.status === 'Ready to Publish' && r.milestone === 'M1').length;
    const readyM2 = allRows.filter((r) => r.status === 'Ready to Publish' && r.milestone === 'M2').length;
    const locked = allRows.filter((r) => r.status === 'Grace Period (Locked)').length;
    const published = allRows.filter((r) => r.status === 'Published').length;
    const voided = allRows.filter((r) => r.status === 'Voided' || r.status === 'Void Pending').length;
    return [
      {
        label: 'Ready to Publish',
        value: readyM1 + readyM2 + locked,
        icon: Activity,
        iconColor: 'text-amber-500',
      },
      { label: 'Published', value: published, icon: Wallet, iconColor: 'text-emerald-500' },
      { label: 'Voided', value: voided, icon: Lock, iconColor: 'text-red-500' },
    ];
  }, [allRows]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allRows
      .filter((r) => {
        const mStatus = statusFilter === 'All' || r.status === statusFilter;
        const mSearch =
          !q ||
          (r.publicId ?? '').toLowerCase().includes(q) ||
          r.caseId.toLowerCase().includes(q) ||
          (r.transactionHash ?? '').toLowerCase().includes(q) ||
          (r.beneficiary ?? '').toLowerCase().includes(q);
        return mStatus && mSearch;
      })
      .sort((a, b) => {
        const caseCmp = (a.caseId || '').localeCompare(b.caseId || '');
        if (caseCmp !== 0) return caseCmp;
        const mRank = (m?: string) => (m === 'M1' ? 1 : m === 'M2' ? 2 : 3);
        return mRank(a.milestone) - mRank(b.milestone);
      });
  }, [allRows, searchQuery, statusFilter]);

  // Pagination standard: max 10 records per page (DESIGN.md)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

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
            <stat.icon className={`stat-icon ${stat.iconColor || 'text-md-primary'}`} size={32} />
            <div className="stat-label">{stat.label}</div>
            <div className="stat-number">{stat.value}</div>
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
            options={availableStatuses.map((s) => ({ value: s, label: s === 'All' ? 'All statuses' : s }))}
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
        <div className="right flex items-center gap-2">
          <NetworkStatusBadge networkInfo={networkInfo} />
          <RefreshButton onClick={loadData} loading={loading} />
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: '135px' }}>Blockchain ID</th>
                <th style={{ width: '140px' }}>Case ID</th>
                <th style={{ width: '110px' }}>Milestone</th>
                <th style={{ width: '110px' }}>Document Hash</th>
                <th style={{ width: '110px' }}>Transaction Hash</th>
                <th style={{ width: '140px' }}>Published Date</th>
                <th style={{ width: '125px' }}>Status</th>
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
                pageRows.map((row, idx, arr) => {
                  const blockchainId = row.publicId?.startsWith('BCN-')
                    ? row.publicId
                    : row.id?.startsWith('BCN-')
                    ? row.id
                    : (row.publicId || row.id);
                  const isFirstInGroup = idx === 0 || row.caseId !== arr[idx - 1].caseId;
                  const isLastInGroup = idx === arr.length - 1 || row.caseId !== arr[idx + 1].caseId;
                  const sameCaseRecords = allRows.filter((r) => r.caseId === row.caseId);

                  return (
                    <React.Fragment key={row.id}>
                      {isFirstInGroup && (
                        <tr className="bg-md-primary/[0.06] dark:bg-md-primary/[0.12] text-xs">
                          <td colSpan={7} className="py-2.5 px-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Folder size={15} className="text-md-primary/70 dark:text-md-primary/80" />
                                <span className="font-mono font-bold text-xs text-md-primary">{row.caseId}</span>
                                <span className="text-md-outline/40 font-bold">·</span>
                                <span className="text-md-on-surface font-semibold text-xs">{row.beneficiary || 'Landowner / Beneficiary'}</span>
                              </div>
                              <span className="text-[11px] font-bold text-md-primary bg-md-primary/10 dark:bg-md-primary/20 px-2.5 py-0.5 rounded-full border border-md-primary/20 font-mono">
                                {sameCaseRecords.length} {sameCaseRecords.length === 1 ? 'Milestone' : 'Milestones'} ({sameCaseRecords.map((r) => r.milestone || 'M1').join(' · ')})
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr
                        className={`row-clickable bg-white dark:bg-slate-900/80 ${
                          isLastInGroup
                            ? 'border-b border-md-outline/25 dark:border-md-outline/30'
                            : 'border-b border-md-outline/10 dark:border-md-outline/10'
                        }`}
                        onClick={() => setModal({ type: 'view', row })}
                      >
                        <td>
                          <div className="flex items-center gap-1.5 cursor-pointer">
                            <span className="font-mono font-bold text-xs text-md-primary" title="View Blockchain Notarization Details">
                              {blockchainId}
                            </span>
                            <CopyButton value={blockchainId} title="Copy Blockchain ID" />
                          </div>
                        </td>
                        <td>
                          <CaseIdCell caseId={row.caseId} onClick={(cid) => setCaseDetailsId(cid)} />
                        </td>
                        <td>
                          <span className="meta-text font-medium">
                            {row.milestone === 'M1'
                              ? 'Award (M1)'
                              : row.milestone === 'M2'
                              ? 'Settlement (M2)'
                              : row.recordType ?? 'Original'}
                          </span>
                        </td>
                        <td className="font-mono text-xs text-md-on-surface-variant">
                          {row.documentHash ? (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <span title={row.documentHash}>{fmtTx(row.documentHash)}</span>
                              <CopyButton value={row.documentHash} title="Copy Document Hash" />
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="font-mono text-xs text-md-on-surface-variant">
                          {row.transactionHash ? (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <span>{fmtTx(row.transactionHash)}</span>
                              <CopyButton value={row.transactionHash} title="Copy Transaction Hash" />
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>{fmtDate(row.publishedAt)}</td>
                        <td>
                          {(() => {
                            const graceLocked =
                              row.status === 'Grace Period (Locked)' ||
                              (!!row.graceEndsAt && Date.now() < new Date(row.graceEndsAt).getTime());
                            if (graceLocked && row.graceEndsAt) {
                              const countdown = formatGraceCountdown(new Date(row.graceEndsAt).getTime() - Date.now());
                              return (
                                <span
                                  className="payment-badge status-locked whitespace-nowrap"
                                  title={`Milestone 1 unlocks in ${countdown} when the statutory 24-hour acceptance grace period ends`}
                                >
                                  <span className="dot" />
                                  Locked ({countdown} Left)
                                </span>
                              );
                            }
                            return ledgerBadge(row.status);
                          })()}
                        </td>
                      </tr>
                    </React.Fragment>
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
        itemLabel="ledger records"
      />

      <div style={{ height: '32px' }} />

      <ViewLedgerModal
        row={modal?.type === 'view' ? modal.row : null}
        onClose={closeModal}
        onAction={(type, r) => setModal({ type, row: r })}
      />
      <PublishModal row={modal?.type === 'publish' ? modal.row : null} onClose={closeModal} onDone={() => { closeModal(); loadData(); }} />
      <VoidModal row={modal?.type === 'void' ? modal.row : null} onClose={closeModal} onDone={() => { closeModal(); loadData(); }} />
      <CaseDetailsModal caseId={caseDetailsId} onClose={() => setCaseDetailsId(null)} />
    </div>
  );
};
