import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, User, Activity, Wallet, Loader2, Lock, CheckCircle2, Folder } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { blockchainApi } from '../../services/blockchainApi';
import { paymentApi } from '../../services/paymentApi';
import { compensationApi } from '../../services/compensationApi';
import { useWallet } from '../../hooks/useWallet';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useAdminIdentity } from '../../hooks/useAdminIdentity';
import { useAuth } from '../../context/AuthContext';
import { usePublishClaims } from '../../hooks/usePublishClaims';
import { usePollingRefresh } from '../../hooks/usePollingRefresh';
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
import { normalizePaymentStatus } from '../Payment/statusMaps';
import '../LandAcquisition/case_management.css';
import '../Payment/payment.css';
import {
  ViewLedgerModal,
  PublishModal,
  ledgerBadge,
  fmtTx,
  fmtDate,
  computeSettlementHash,
  formatClaimElapsed,
} from './blockchainModals';
import type { LedgerRow, PublishLockState } from './blockchainModals';

type ModalState =
  | { type: 'view'; row: LedgerRow }
  | { type: 'publish'; row: LedgerRow }
  | null;

const SORT_STORAGE_KEY = 'blockchain_overview_sort';
type SortKey = 'priority' | 'recent';
const SORT_OPTIONS = [
  { value: 'priority', label: 'Default (Action Priority)' },
  { value: 'recent', label: 'Most Recent Activity' },
] as const;

export const BlockchainDashboard: React.FC = () => {
  const { walletAddress, walletConnected, error: walletError, setError: setWalletError, connectWallet: handleConnectWallet } = useWallet();
  const { identityId } = useAdminIdentity();
  // Live cross-admin publish locks, polled so a record another admin is
  // publishing is visibly taken within seconds rather than after minutes of work.
  const { user } = useAuth();
  const { claimFor, refresh: refreshClaims } = usePublishClaims(user?.userId);
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
  const { notify } = useNotification();
  const [searchQuery, setSearchQuery] = useState('');
  const [caseDetailsId, setCaseDetailsId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    const stored = localStorage.getItem(SORT_STORAGE_KEY) as SortKey | null;
    return stored && SORT_OPTIONS.some((o) => o.value === stored) ? stored : 'priority';
  });
  const [records, setRecords] = useState<LedgerRow[]>([]);
  const [readyRows, setReadyRows] = useState<LedgerRow[]>([]);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    localStorage.setItem(SORT_STORAGE_KEY, sortKey);
  }, [sortKey]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.stat-card', { opacity: 0, y: 28, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.1, ease: 'back.out(1.3)', delay: 0.1 });
    gsap.fromTo('.filter-bar, .action-bar, .table-wrap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.07, ease: 'power2.out', delay: 0.45 });
  }, { scope: containerRef });

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!silent) {
      setLoading(true);
      setError('');
    }
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

      const publishedRecords: LedgerRow[] = [];
      const readyRecordsMap = new Map<string, any>();

      (recData.records || []).forEach((r: any) => {
        const s = String(r.status || '').toUpperCase().replace(/[\s_]+/g, '_');
        const isM1 = (r.milestone ?? 'AWARD') === 'AWARD';
        if (s === 'READY_TO_PUBLISH') {
          readyRecordsMap.set(`${r.caseId}#${isM1 ? 'M1' : 'M2'}`, r);
        } else {
          const pmt: any = paidMap.get(r.caseId);
          const off: any = offerMap.get(r.caseId);
          const ben = r.beneficiary || pmt?.beneficiary || pmt?.accountHolderName || off?.landOwnership?.landOwner?.name;
          const amt = r.amount || pmt?.amount || off?.offerAmount;
          publishedRecords.push({
            id: r.id,
            caseId: r.caseId,
            publicId: r.id,
            milestone: isM1 ? ('M1' as const) : ('M2' as const),
            onChainKey: r.onChainKey || `${r.caseId}#${isM1 ? 'M1' : 'M2'}`,
            transactionHash: r.transactionHash,
            documentHash: r.documentHash,
            beneficiary: ben,
            amount: amt,
            status: 'Published',
            publishedAt: r.publishedAt ?? r.createdAt,
            createdAt: r.createdAt,
            recordType: 'Original',
            bankName: pmt?.bankName,
            accountNumber: pmt?.accountNumber,
            bankReferenceNumber: pmt?.receipt?.bankReferenceNumber,
            paidAt: pmt?.receipt?.generatedAt || pmt?.paidAt || pmt?.updatedAt,
          });
        }
      });

      // FR-019 dual-milestone "Ready to Publish" derivation:
      //   M1 (Award)  — accepted offers past the 24-hour grace window, Form H
      //                 hash frozen, with no M1 record on the ledger yet.
      //   M2 (Settlement) — Paid payment cases whose receipt hash has no M2
      //                 record on the ledger yet. Paid only: the settlement is
      //                 locked until the member's receipt is confirmed (FR-005).
      const ACCEPTANCE_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
      const now = Date.now();
      const m1Published = new Set(
        publishedRecords.filter((r) => r.milestone === 'M1').map((r) => r.caseId)
      );
      const m2Published = new Set(
        publishedRecords.filter((r) => r.milestone === 'M2').map((r) => r.caseId)
      );

      const nowYear = new Date().getFullYear();
      const nowMonth = String(new Date().getMonth() + 1).padStart(2, '0');
      const bcnPrefix = `BCN-${nowYear}-${nowMonth}-`;

      let maxSeq = 0;
      (recData.records || []).forEach((r: any) => {
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
        .sort((a, b) => {
          const timeA = a.acceptedAt ? new Date(a.acceptedAt).getTime() : 0;
          const timeB = b.acceptedAt ? new Date(b.acceptedAt).getTime() : 0;
          if (timeA !== timeB) return timeA - timeB;
          return (a.caseId || '').localeCompare(b.caseId || '');
        });

      const awardReady: LedgerRow[] = awardOffers.map((o) => {
        const existingRec = readyRecordsMap.get(`${o.caseId}#M1`);
        let bcnId = existingRec?.id;
        if (!bcnId) {
          currentSeq += 1;
          bcnId = `${bcnPrefix}${String(currentSeq).padStart(4, '0')}`;
        }
        const acceptedAtMs = o.acceptedAt ? new Date(o.acceptedAt).getTime() : null;
        const graceEndsAtMs = acceptedAtMs != null ? acceptedAtMs + ACCEPTANCE_GRACE_PERIOD_MS : null;
        const graceLocked = graceEndsAtMs != null && now < graceEndsAtMs;
        const m1Sec = Math.floor((acceptedAtMs || now) / 1000);
        return {
          id: bcnId,
          publicId: bcnId,
          caseId: o.caseId,
          milestone: 'M1' as const,
          onChainKey: existingRec?.onChainKey || `${o.caseId}#M1-${m1Sec}`,
          status: graceLocked ? 'Grace Period (Locked)' : 'Ready to Publish',
          beneficiary: o.landOwnership?.landOwner?.name,
          amount: o.offerAmount,
          documentHash: o.blockchainHash || existingRec?.documentHash || null,
          recordType: 'Original' as const,
          publishedAt: null,
          graceEndsAt: graceEndsAtMs,
          acceptedAt: o.acceptedAt || null,
          createdAt: existingRec?.createdAt || o.createdAt || undefined,
          caseCreatedAt: o.case?.createdAt || o.case?.registrationDate || undefined,
        };
      });

      const paid = (paidRes.cases || [])
        .filter((c: any) => normalizePaymentStatus(c.status) === 'Paid')
        .sort((a: any, b: any) => {
          const timeA = a.updatedAt || a.paidAt ? new Date(a.updatedAt || a.paidAt).getTime() : 0;
          const timeB = b.updatedAt || b.paidAt ? new Date(b.updatedAt || b.paidAt).getTime() : 0;
          if (timeA !== timeB) return timeA - timeB;
          return (a.caseId || '').localeCompare(b.caseId || '');
        });

      const settlementReady: LedgerRow[] = await Promise.all(
        paid
          .filter((c: any) => !m2Published.has(c.caseId))
          .map(async (c: any) => {
            const existingRec = readyRecordsMap.get(`${c.caseId}#M2`);
            let bcnId = existingRec?.id;
            if (!bcnId) {
              currentSeq += 1;
              bcnId = `${bcnPrefix}${String(currentSeq).padStart(4, '0')}`;
            }
            const paidAtMs = c.receipt?.generatedAt || c.updatedAt ? new Date(c.receipt?.generatedAt || c.updatedAt).getTime() : now;
            const m2Sec = Math.floor(paidAtMs / 1000);
            return {
              id: bcnId,
              publicId: bcnId,
              caseId: c.caseId,
              milestone: 'M2' as const,
              onChainKey: existingRec?.onChainKey || `${c.caseId}#M2-${m2Sec}`,
              status: 'Ready to Publish',
              documentHash: c.receipt?.documentHash || (await computeSettlementHash(c.caseId, c.amount)),
              certificateVersion: 1,
              beneficiary: c.accountHolderName || c.beneficiaryId,
              amount: c.amount,
              recordType: 'Original' as const,
              publishedAt: null,
              graceEndsAt: null,
              acceptedAt: null,
              paidAt: c.receipt?.generatedAt || c.paidAt || c.updatedAt || null,
              createdAt: existingRec?.createdAt || c.receipt?.generatedAt || c.updatedAt || undefined,
              bankName: c.bankName,
              accountNumber: c.accountNumber,
              bankReferenceNumber: c.receipt?.bankReferenceNumber,
            };
          })
      );

      setRecords(publishedRecords);
      setReadyRows([...awardReady, ...settlementReady]);
      setNetworkInfo(netData);
    } catch (err: any) {
      // A silent tick keeps the last good rows on screen; only an explicit
      // load (mount, Retry, Refresh) is allowed to surface an error banner.
      if (!silent) setError(err.message || 'Failed to load ledger data');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Records change from other admins' browsers (publish, notarize), so the
  // table refreshes on its own instead of waiting for a manual refresh.
  usePollingRefresh(
    () => loadData({ silent: true }),
    { intervalMs: 5_000, enabled: !modal }
  );

  const allRows = useMemo(() => [...readyRows, ...records], [readyRows, records]);

  const getRowStatus = (r: LedgerRow): string => {
    if (r.status === 'Published' || r.status === 'PUBLISHED' || r.status === 'CONFIRMED') {
      return 'Published';
    }
    const isGraceLocked =
      r.milestone === 'M1' &&
      !!r.graceEndsAt &&
      currentTime < new Date(r.graceEndsAt).getTime();
    if (isGraceLocked) return 'Grace Period (Locked)';
    if (r.status === 'Grace Period (Locked)') return 'Ready to Publish';
    return r.status || 'Ready to Publish';
  };

  // Dynamically derive available statuses strictly from loaded records
  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    allRows.forEach((r) => {
      const s = getRowStatus(r);
      if (s) set.add(s);
    });
    return ['All', ...Array.from(set).sort()];
  }, [allRows, currentTime]);

  useEffect(() => {
    if (statusFilter !== 'All' && !availableStatuses.includes(statusFilter)) {
      setStatusFilter('All');
    }
  }, [availableStatuses, statusFilter]);

  const stats = useMemo(() => {
    const readyM1 = allRows.filter((r) => getRowStatus(r) === 'Ready to Publish' && r.milestone === 'M1').length;
    const readyM2 = allRows.filter((r) => getRowStatus(r) === 'Ready to Publish' && r.milestone === 'M2').length;
    const locked = allRows.filter((r) => getRowStatus(r) === 'Grace Period (Locked)').length;
    const published = allRows.filter((r) => getRowStatus(r) === 'Published').length;
    const settledM2 = allRows.filter((r) => getRowStatus(r) === 'Published' && r.milestone === 'M2').length;
    return [
      {
        label: 'Ready to Publish',
        value: readyM1 + readyM2 + locked,
        icon: Activity,
        iconColor: 'text-amber-500',
      },
      { label: 'Published (All)', value: published, icon: Wallet, iconColor: 'text-emerald-500' },
      { label: 'Settled (M2)', value: settledM2, icon: CheckCircle2, iconColor: 'text-blue-500' },
    ];
  }, [allRows, currentTime]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // Determine representative/earliest blockchain ID for each case
    const caseBcnMap = new Map<string, string>();
    allRows.forEach((r) => {
      const bcn = r.publicId?.startsWith('BCN-')
        ? r.publicId
        : r.id?.startsWith('BCN-')
        ? r.id
        : (r.publicId || r.id || '');
      const existing = caseBcnMap.get(r.caseId);
      if (!existing || bcn.localeCompare(existing, undefined, { numeric: true, sensitivity: 'base' }) < 0) {
        caseBcnMap.set(r.caseId, bcn);
      }
    });

    // Group allRows by caseId to determine each case's overall milestone state
    const caseRowsMap = new Map<string, LedgerRow[]>();
    allRows.forEach((r) => {
      const list = caseRowsMap.get(r.caseId) || [];
      list.push(r);
      caseRowsMap.set(r.caseId, list);
    });

    // Helper for latest datetime of a row
    const getRowTime = (r: LedgerRow): number => {
      const candidates = [
        r.publishedAt,
        r.paidAt,
        r.acceptedAt,
        r.createdAt,
        r.caseCreatedAt,
      ];
      let latest = 0;
      for (const c of candidates) {
        if (!c) continue;
        const t = new Date(c).getTime();
        if (!isNaN(t) && t > latest) {
          latest = t;
        }
      }
      return latest;
    };

    // Case-level status priority rank:
    // Rank 1: m1: ready to publish
    // Rank 2: m2(grouped with m1 published): ready to publish
    // Rank 3: m1 + m2: published
    // Rank 4: m1: published
    const caseRankMap = new Map<string, number>();
    const caseLatestTimeMap = new Map<string, number>();

    caseRowsMap.forEach((cRows, cId) => {
      const m1 = cRows.find((r) => r.milestone === 'M1');
      const m2 = cRows.find((r) => r.milestone === 'M2');

      const s1 = m1 ? getRowStatus(m1) : null;
      const s2 = m2 ? getRowStatus(m2) : null;

      const isM1Ready = s1 === 'Ready to Publish' || s1 === 'Grace Period (Locked)';
      const isM1Published = s1 === 'Published';
      const isM2Ready = s2 === 'Ready to Publish';
      const isM2Published = s2 === 'Published';

      if (isM1Ready) {
        caseRankMap.set(cId, 1);
      } else if (isM2Ready) {
        caseRankMap.set(cId, 2);
      } else if (isM1Published && isM2Published) {
        caseRankMap.set(cId, 3);
      } else if (isM1Published) {
        caseRankMap.set(cId, 4);
      } else {
        caseRankMap.set(cId, 5);
      }

      let maxT = 0;
      cRows.forEach((r) => {
        const t = getRowTime(r);
        if (t > maxT) maxT = t;
      });
      caseLatestTimeMap.set(cId, maxT);
    });

    // Milestone ranking within the same case:
    // Actionable ready to publish on top (M2 ready then M1 ready), then published (M1 published then M2 published)
    const getMilestoneRankWithinCase = (r: LedgerRow) => {
      const s = getRowStatus(r);
      if (r.milestone === 'M2' && (s === 'Ready to Publish' || s === 'Grace Period (Locked)')) return 1;
      if (r.milestone === 'M1' && (s === 'Ready to Publish' || s === 'Grace Period (Locked)')) return 2;
      if (r.milestone === 'M1') return 3;
      if (r.milestone === 'M2') return 4;
      return 5;
    };

    return allRows
      .filter((r) => {
        const effectiveStatus = getRowStatus(r);
        const mStatus = statusFilter === 'All' || effectiveStatus === statusFilter;
        const mSearch =
          !q ||
          (r.publicId ?? '').toLowerCase().includes(q) ||
          r.caseId.toLowerCase().includes(q) ||
          (r.transactionHash ?? '').toLowerCase().includes(q) ||
          (r.beneficiary ?? '').toLowerCase().includes(q);
        return mStatus && mSearch;
      })
      .sort((a, b) => {
        if (a.caseId !== b.caseId) {
          if (sortKey === 'recent') {
            const tA = caseLatestTimeMap.get(a.caseId) || 0;
            const tB = caseLatestTimeMap.get(b.caseId) || 0;
            if (tA !== tB) return tB - tA; // Latest datetime first
          } else {
            // Default: Status Priority (1 > 2 > 3 > 4)
            const rankA = caseRankMap.get(a.caseId) ?? 99;
            const rankB = caseRankMap.get(b.caseId) ?? 99;
            if (rankA !== rankB) return rankA - rankB;
          }

          // Secondary sort: Blockchain ID
          const bcnA = caseBcnMap.get(a.caseId) || a.caseId;
          const bcnB = caseBcnMap.get(b.caseId) || b.caseId;
          const bcnCmp = bcnA.localeCompare(bcnB, undefined, { numeric: true, sensitivity: 'base' });
          if (bcnCmp !== 0) return bcnCmp;
          return a.caseId.localeCompare(b.caseId, undefined, { numeric: true });
        }

        // Within the same case:
        if (sortKey === 'recent') {
          const timeA = getRowTime(a);
          const timeB = getRowTime(b);
          if (timeA !== timeB) return timeB - timeA;
        } else {
          const mRankA = getMilestoneRankWithinCase(a);
          const mRankB = getMilestoneRankWithinCase(b);
          if (mRankA !== mRankB) return mRankA - mRankB;
        }

        const bcnIdA = a.publicId?.startsWith('BCN-') ? a.publicId : a.id?.startsWith('BCN-') ? a.id : (a.publicId || a.id || '');
        const bcnIdB = b.publicId?.startsWith('BCN-') ? b.publicId : b.id?.startsWith('BCN-') ? b.id : (b.publicId || b.id || '');
        return bcnIdA.localeCompare(bcnIdB, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [allRows, searchQuery, statusFilter, sortKey, currentTime]);

  // Pagination standard: max 10 records per page (DESIGN.md)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortKey]);

  const closeModal = () => setModal(null);

  return (
    <div className="main" ref={containerRef}>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Blockchain Overview</h1>
          <div className="sub">
            Full view of the ledger — notarize awards, publish settlements, and audit immutable on-chain records.
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
          <Button variant="text" size="sm" onClick={() => loadData()}>Retry</Button>
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
            label="Sort"
            options={SORT_OPTIONS as unknown as { value: string; label: string }[]}
            value={sortKey}
            onChange={(val) => setSortKey(val as SortKey)}
            placeholder="Sort by"
          />
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
                <th style={{ width: '135px' }}>Case ID</th>
                <th style={{ width: '90px' }}>Milestone</th>
                <th style={{ width: '100px' }}>Document Hash</th>
                <th style={{ width: '110px' }}>Transaction Hash</th>
                <th style={{ width: '120px' }}>Published Date</th>
                <th style={{ width: '130px', paddingRight: '10px' }}>Status</th>
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

                  const effectiveStatus = getRowStatus(row);
                  const effectiveRow: LedgerRow = {
                    ...row,
                    status: effectiveStatus,
                  };

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
                        className={`row-clickable bg-white dark:bg-slate-900/80 ${isLastInGroup
                          ? 'border-b border-md-outline/25 dark:border-md-outline/30'
                          : 'border-b border-md-outline/10 dark:border-md-outline/10'
                          }`}
                        onClick={() => setModal({ type: 'view', row: effectiveRow })}
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
                        <td style={{ paddingRight: '20px' }}>
                          {(() => {
                            const isGraceLocked =
                              row.milestone === 'M1' &&
                              !!row.graceEndsAt &&
                              currentTime < new Date(row.graceEndsAt).getTime();
                            const remainingMs = isGraceLocked && row.graceEndsAt
                              ? new Date(row.graceEndsAt).getTime() - currentTime
                              : 0;
                            const countdown = isGraceLocked ? formatGraceCountdown(remainingMs) : '';
                            const lock = lockFor(row);
                            if (lock.heldByOther) {
                              return (
                                <span
                                  className="payment-badge info whitespace-nowrap"
                                  title={`${lock.adminName || 'Another government administrator'} is publishing this record to Sepolia · ${formatClaimElapsed(
                                    lock.claimedAt ? Math.max(0, currentTime - new Date(lock.claimedAt).getTime()) : 0
                                  )} elapsed. The lock clears when they finish, or automatically if their session drops.`}
                                >
                                  <span className="dot" />
                                  Publishing · {lock.adminName || 'Gov Admin'}
                                </span>
                              );
                            }
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
                            return ledgerBadge(effectiveStatus);
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

        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="ledger records"
        />
      </div>

      <div style={{ height: '32px' }} />

      <ViewLedgerModal
        row={modal?.type === 'view' ? modal.row : null}
        onClose={closeModal}
        onAction={(type, r) => setModal({ type, row: r })}
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
