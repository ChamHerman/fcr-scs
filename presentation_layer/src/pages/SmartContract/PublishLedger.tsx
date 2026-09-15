import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, User, Wallet, Loader2, UploadCloud, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { blockchainApi } from '../../services/blockchainApi';
import { paymentApi } from '../../services/paymentApi';
import { compensationApi } from '../../services/compensationApi';
import { useWallet } from '../../hooks/useWallet';
import { useAuth } from '../../context/AuthContext';
import { usePublishClaims } from '../../hooks/usePublishClaims';
import { CaseIdCell } from '../../components/admin/CaseIdCell';
import { CaseDetailsModal } from '../Payment/CaseDetailsModal';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { CopyButton } from '../../components/ui/CopyButton';
import { Pagination } from '../../components/ui/Pagination';
import { Select } from '../../components/ui/Select';
import { WalletButton } from '../../components/ui/WalletButton';
import { NetworkStatusBadge } from './NetworkSelector';
import type { NetworkInfo } from './NetworkSelector';
import { RefreshButton } from '../Payment/RefreshButton';
import '../LandAcquisition/case_management.css';
import '../Payment/payment.css';
import { normalizePaymentStatus } from '../Payment/statusMaps';
import {
  ViewLedgerModal,
  PublishModal,
  ledgerBadge,
  fmtDate,
  fmtAmount,
  fmtTx,
  computeSettlementHash,
  formatClaimElapsed,
} from './blockchainModals';
import type { LedgerRow, PublishLockState } from './blockchainModals';

type ModalState = { type: 'view'; row: LedgerRow } | { type: 'publish'; row: LedgerRow } | null;
type TabKey = 'm1' | 'm2';

const TABS: Array<{ key: TabKey; label: string; short: string }> = [
  { key: 'm1', label: 'Milestone 1 — Statutory Award (Form H)', short: 'Award (M1)' },
  { key: 'm2', label: 'Milestone 2 — Disbursement Settlement (Receipt)', short: 'Settlement (M2)' },
];

/** "5m left" / "3h 20m left" / "45s left" countdown for grace-locked award rows. */
export const formatGraceCountdown = (msRemaining: number): string => {
  if (msRemaining <= 0) return '';
  const totalSeconds = Math.max(1, Math.ceil(msRemaining / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
};

export const PublishLedger: React.FC = () => {
  const [searchParams] = useSearchParams();
  const deepLink = searchParams.get('caseId');
  const [activeTab, setActiveTab] = useState<TabKey>('m1');
  const [m1Rows, setM1Rows] = useState<LedgerRow[]>([]);
  const [m2Rows, setM2Rows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(deepLink || '');
  const [modal, setModal] = useState<ModalState>(null);
  const [caseDetailsId, setCaseDetailsId] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const pageRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({ m1: null, m2: null });
  const sliderRef = useRef<HTMLDivElement>(null);
  const isFirstTabRender = useRef(true);

  const { walletAddress, walletConnected, error: walletError, connectWallet } = useWallet();

  // Live cross-admin publish locks, polled so a record another admin is
  // publishing is visibly taken within seconds instead of after minutes of work.
  const { user } = useAuth();
  const { claimFor, claimedByOther, refresh: refreshClaims } = usePublishClaims(user?.userId);
  const lockFor = useCallback(
    (row: LedgerRow): PublishLockState => {
      const claim = claimFor(row.caseId, row.milestone);
      if (!claim) return { heldByOther: false, heldByMe: false };
      return {
        heldByOther: claim.adminId !== user?.userId,
        heldByMe: claim.adminId === user?.userId,
        adminName: claim.adminName,
        claimedAt: claim.claimedAt,
      };
    },
    [claimFor, user?.userId]
  );

  useGSAP(() => {
    gsap.fromTo('.publish-header', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' });
    gsap.fromTo('.filter-bar, .action-bar, .table-wrap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'back.out(1.2)', delay: 0.2 });
  }, { scope: pageRef });

  useEffect(() => {
    const activeEl = tabRefs.current[activeTab];
    if (activeEl && sliderRef.current) {
      if (isFirstTabRender.current) {
        gsap.set(sliderRef.current, {
          x: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
        });
        isFirstTabRender.current = false;
      } else {
        gsap.to(sliderRef.current, {
          x: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          duration: 0.35,
          ease: 'power2.out',
        });
      }
    }
  }, [activeTab]);

  useEffect(() => {
    const handleResize = () => {
      const activeEl = tabRefs.current[activeTab];
      if (activeEl && sliderRef.current) {
        gsap.set(sliderRef.current, {
          x: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [netData, allCases, recordsRes, offersRes] = await Promise.all([
        blockchainApi.getNetworkInfo().catch(() => null),
        paymentApi.getAllCases().catch(() => ({ cases: [] })),
        blockchainApi.getRecords().catch(() => ({ records: [] })),
        // FR-019: accepted offers carry the frozen Form H binary hash that
        // anchors Milestone 1.
        compensationApi
          .getAllOfferLetters({ status: 'ACCEPTED', limit: 200 } as any)
          .catch(() => ({ offers: [], offerLetters: [] })),
      ]);

      setNetworkInfo(netData);

      const records: any[] = recordsRes.records || [];
      const m1Published = new Set<string>();
      const m2Published = new Set<string>();
      const readyRecordsMap = new Map<string, any>();
      records.forEach((r) => {
        const isM1 = (r.milestone ?? 'AWARD') === 'AWARD';
        const s = String(r.status || '').toUpperCase().replace(/[\s_]+/g, '_');
        if (s === 'READY_TO_PUBLISH') {
          readyRecordsMap.set(`${r.caseId}#${isM1 ? 'M1' : 'M2'}`, r);
        } else if (s === 'PUBLISHED') {
          if (isM1) m1Published.add(r.caseId);
          else m2Published.add(r.caseId);
        }
      });

      // ----- Tab 1: Milestone 1 Award queue, built from ACCEPTED offers —
      // they carry acceptedAt (grace clock), the frozen Form H hash and the
      // beneficiary, none of which exist on lazily-ingested payment cases.
      const ACCEPTANCE_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
      const now = Date.now();
      const offers: any[] = offersRes.offers || offersRes.offerLetters || [];
      const awardQueue: LedgerRow[] = [];
      for (const offer of offers) {
        const caseId: string | undefined = offer.caseId;
        if (!caseId || m1Published.has(caseId)) continue;
        const existingRec = readyRecordsMap.get(`${caseId}#M1`);
        const bcnId = existingRec?.id || caseId;
        const acceptedAtMs = offer.acceptedAt ? new Date(offer.acceptedAt).getTime() : null;
        const graceEndsAtMs = acceptedAtMs != null ? acceptedAtMs + ACCEPTANCE_GRACE_PERIOD_MS : null;
        const graceLocked = graceEndsAtMs != null && now < graceEndsAtMs;
        const m1Sec = Math.floor((acceptedAtMs || now) / 1000);
        awardQueue.push({
          id: existingRec?.id || `M1-${caseId}`,
          caseId,
          milestone: 'M1',
          onChainKey: existingRec?.onChainKey || `${caseId}#M1-${m1Sec}`,
          publicId: bcnId,
          beneficiary: offer.landOwnership?.landOwner?.name || undefined,
          amount: offer.offerAmount,
          status: graceLocked ? 'Grace Period (Locked)' : 'Ready to Publish',
          documentHash: offer.blockchainHash || existingRec?.documentHash || null,
          graceEndsAt: graceEndsAtMs,
          acceptedAt: offer.acceptedAt || null,
          createdAt: existingRec?.createdAt || offer.createdAt || undefined,
          caseCreatedAt: offer.case?.createdAt || offer.case?.registrationDate || undefined,
        });
      }
      setM1Rows(awardQueue);

      // ----- Tab 2: Milestone 2 Settlement queue — Paid without an M2 record.
      // The anchor hash is the frozen receipt binary SHA-256 (FR-019); legacy
      // rows without a persisted hash fall back to the deterministic computed one.
      const settlementQueue: LedgerRow[] = [];
      for (const pc of (allCases.cases || [])) {
        const norm = normalizePaymentStatus(pc.status);
        if (norm !== 'Paid' && norm !== 'Transfer Succeed') continue;
        if (m2Published.has(pc.caseId)) continue;
        const existingRec = readyRecordsMap.get(`${pc.caseId}#M2`);
        const docHash = pc.receipt?.documentHash || (await computeSettlementHash(pc.caseId, pc.amount));
        const paidAtMs = pc.receipt?.generatedAt || pc.updatedAt ? new Date(pc.receipt?.generatedAt || pc.updatedAt).getTime() : now;
        const m2Sec = Math.floor(paidAtMs / 1000);
        settlementQueue.push({
          id: existingRec?.id || pc.id || `M2-${pc.caseId}`,
          caseId: pc.caseId,
          milestone: 'M2',
          onChainKey: existingRec?.onChainKey || `${pc.caseId}#M2-${m2Sec}`,
          publicId: existingRec?.id || pc.paymentId || pc.id,
          beneficiary: pc.accountHolderName || pc.beneficiaryId,
          amount: pc.amount,
          status: 'Ready to Publish',
          documentHash: docHash,
          certificateVersion: 1,
          bankName: pc.bankName,
          accountNumber: pc.accountNumber,
          bankReferenceNumber: pc.receipt?.bankReferenceNumber,
          paidAt: pc.receipt?.generatedAt || pc.updatedAt,
        });
      }
      setM2Rows(settlementQueue);
    } catch (err: any) {
      setError(err.message || 'Failed to load publish queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // FR-012 grace policy: poll while the Award tab is open (and no modal blocks
  // the view) so a grace-locked row flips to publishable the moment the
  // 24-hour window elapses — no manual refresh needed.
  useEffect(() => {
    if (activeTab !== 'm1' || modal) return;
    const interval = setInterval(loadData, 60_000);
    return () => clearInterval(interval);
  }, [activeTab, modal, loadData]);

  const rows = activeTab === 'm1' ? m1Rows : m2Rows;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows
      .filter((r) => !q || r.caseId.toLowerCase().includes(q) || (r.beneficiary ?? '').toLowerCase().includes(q))
      .sort((a, b) => {
        const getPriority = (r: LedgerRow) => {
          const isLocked =
            r.milestone === 'M1' &&
            !!r.graceEndsAt &&
            currentTime < new Date(r.graceEndsAt).getTime();
          if ((r.status === 'Ready to Publish' || r.status === 'Grace Period (Locked)') && !isLocked) return 1;
          if (isLocked) return 2;
          if (r.status === 'Published') return 3;
          return 4;
        };
        const pA = getPriority(a);
        const pB = getPriority(b);
        if (pA !== pB) return pA - pB;

        const bcnIdA = a.publicId?.startsWith('BCN-') ? a.publicId : a.id?.startsWith('BCN-') ? a.id : (a.publicId || a.id || '');
        const bcnIdB = b.publicId?.startsWith('BCN-') ? b.publicId : b.id?.startsWith('BCN-') ? b.id : (b.publicId || b.id || '');
        const bcnCmp = bcnIdA.localeCompare(bcnIdB, undefined, { numeric: true, sensitivity: 'base' });
        if (bcnCmp !== 0) return bcnCmp;

        return (a.caseId || '').localeCompare(b.caseId || '', undefined, { numeric: true });
      });
  }, [rows, searchQuery, currentTime]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const closeModal = () => setModal(null);

  return (
    <div className="main" ref={pageRef}>
      <div className="topbar publish-header">
        <div className="topbar-left">
          <h1>Publish to Ledger</h1>
          <div className="sub">
            Dual-milestone notarization — statutory awards and settlement completions anchored on-chain.
          </div>
        </div>
        <div className="topbar-right flex items-center gap-3">
          {walletConnected ? (
            <WalletButton walletAddress={walletAddress || undefined} label="Government Wallet" />
          ) : (
            <Button onClick={connectWallet} variant="animated-primary" className="font-semibold flex items-center gap-2">
              <Wallet size={16} /> Connect MetaMask
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
        <div className="my-4 px-4 py-3 rounded-xl bg-md-error/10 border border-md-error/30 text-md-on-error text-sm">{error}</div>
      )}
      {walletError && <p className="text-red-500 my-2">{walletError}</p>}

      {/* Single continuous trail / track with GSAP sliding indicator */}
      <div className="relative inline-flex items-center p-1 rounded-full bg-md-surface-container-high border border-md-outline/15 shadow-inner mt-6 max-w-full overflow-x-auto no-scrollbar">
        {/* Animated GSAP sliding pill indicator */}
        <div
          ref={sliderRef}
          className="absolute top-1 bottom-1 rounded-full bg-md-primary shadow-sm pointer-events-none"
          style={{ willChange: 'transform, width' }}
        />
        {TABS.map((t) => (
          <button
            key={t.key}
            ref={(el) => { tabRefs.current[t.key] = el; }}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`relative z-10 shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-colors duration-200 cursor-pointer ${activeTab === t.key
              ? 'text-white font-bold'
              : 'text-md-on-surface-variant hover:text-md-on-surface'
              }`}
            title={t.label}
          >
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.short}</span>
          </button>
        ))}
      </div>

      <div className="filter-bar mt-4">
        <div className="search-wrap" style={{ flex: 1, minWidth: '300px' }}>
          <SearchInput placeholder="Search case, beneficiary or amount..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="filter-group">
          <Button variant="outlined" size="sm" onClick={() => setSearchQuery('')}>Clear</Button>
        </div>
      </div>

      <div className="action-bar">
        <div className="left">
          <UploadCloud size={18} />
          <span className="count">
            {filtered.length} record{filtered.length === 1 ? '' : 's'} ready to publish
            {activeTab === 'm1' ? ' (Milestone 1)' : ' (Milestone 2)'}
          </span>
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
                <th style={{ width: '120px' }}>Case ID</th>
                <th style={{ width: '140px' }}>Beneficiary</th>
                <th style={{ width: '115px' }}>Amount</th>
                <th style={{ width: '135px' }}>Document Hash</th>
                <th style={{ width: '130px', paddingRight: '10px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">
                    <Loader2 size={22} className="inline animate-spin" /><span className="ml-2">Loading publish queue…</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">
                    Nothing ready to publish right now.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const blockchainId = row.publicId?.startsWith('BCN-')
                    ? row.publicId
                    : row.id?.startsWith('BCN-')
                      ? row.id
                      : `BCN-${row.caseId}-${row.milestone || (activeTab === 'm2' ? 'M2' : 'M1')}`;

                  const isGraceLocked =
                    activeTab === 'm1' &&
                    !!row.graceEndsAt &&
                    currentTime < new Date(row.graceEndsAt).getTime();
                  const remainingMs = isGraceLocked && row.graceEndsAt
                    ? new Date(row.graceEndsAt as string | number).getTime() - currentTime
                    : 0;
                  const countdown = isGraceLocked ? formatGraceCountdown(remainingMs) : '';
                  const effectiveStatus = isGraceLocked
                    ? 'Grace Period (Locked)'
                    : (row.status === 'Grace Period (Locked)' ? 'Ready to Publish' : (row.status || 'Ready to Publish'));
                  const effectiveRow: LedgerRow = {
                    ...row,
                    status: effectiveStatus,
                  };
                  const lock = lockFor(row);
                  const claimElapsed = lock.claimedAt
                    ? Math.max(0, currentTime - new Date(lock.claimedAt).getTime())
                    : 0;

                  return (
                    <tr
                      key={row.id}
                      className={`row-clickable${deepLink === row.caseId ? ' bg-md-secondary-container/40' : ''}`}
                      onClick={() => setModal({ type: 'view', row: effectiveRow })}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 cursor-pointer">
                          <span
                            className="font-mono font-bold text-xs text-md-primary hover:underline"
                            onClick={() => setModal({ type: 'view', row: effectiveRow })}
                            title="View Ledger Details"
                          >
                            {blockchainId}
                          </span>
                          <CopyButton value={blockchainId} title="Copy Blockchain ID" />
                        </div>
                      </td>
                      <td><CaseIdCell caseId={row.caseId} onClick={(cid) => setCaseDetailsId(cid)} /></td>
                      <td>{row.beneficiary || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{fmtAmount(row.amount)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {row.documentHash ? (
                            <>
                              <span className="font-mono text-xs text-md-on-surface-variant" title={row.documentHash}>
                                {fmtTx(row.documentHash)}
                              </span>
                              <CopyButton value={row.documentHash} title="Copy Document Hash" />
                            </>
                          ) : (
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              Hash Pending
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ paddingRight: '20px' }}>
                        {(() => {
                          if (isGraceLocked) {
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
                          if (lock.heldByOther) {
                            return (
                              <span
                                className="payment-badge info whitespace-nowrap"
                                title={`${lock.adminName || 'Another government administrator'} is publishing this record to Sepolia · ${formatClaimElapsed(claimElapsed)} elapsed. The lock clears when they finish, or automatically if their session drops.`}
                              >
                                <span className="dot" />
                                Publishing · {lock.adminName || 'Gov Admin'}
                              </span>
                            );
                          }
                          if (activeTab === 'm1' && !row.documentHash) {
                            return (
                              <span className="payment-badge warning whitespace-nowrap" title="Form H byte fingerprint not generated yet">
                                <span className="dot" />
                                Hash Missing
                              </span>
                            );
                          }
                          return ledgerBadge(effectiveStatus);
                        })()}
                      </td>
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
        itemLabel="records"
      />

      <div style={{ height: '32px' }} />

      <ViewLedgerModal
        row={modal?.type === 'view' ? modal.row : null}
        onClose={closeModal}
        onAction={(act, r) => setModal({ type: act, row: r })}
        lock={modal ? lockFor(modal.row) : undefined}
      />
      <PublishModal
        row={modal?.type === 'publish' ? modal.row : null}
        onClose={closeModal}
        lock={modal ? lockFor(modal.row) : undefined}
        onLocksChanged={refreshClaims}
        onDone={() => { closeModal(); loadData(); refreshClaims(); }}
      />
      <CaseDetailsModal caseId={caseDetailsId} onClose={() => setCaseDetailsId(null)} />
    </div>
  );
};
