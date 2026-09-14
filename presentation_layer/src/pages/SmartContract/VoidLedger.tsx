import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, User, Wallet, Loader2, Ban, RefreshCw, Folder } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { blockchainApi } from '../../services/blockchainApi';
import { paymentApi } from '../../services/paymentApi';
import { compensationApi } from '../../services/compensationApi';
import { useWallet } from '../../hooks/useWallet';
import { CaseIdCell } from '../../components/admin/CaseIdCell';
import { CaseDetailsModal } from '../Payment/CaseDetailsModal';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { CopyButton } from '../../components/ui/CopyButton';
import { Pagination } from '../../components/ui/Pagination';
import { WalletButton } from '../../components/ui/WalletButton';
import { NetworkStatusBadge } from './NetworkSelector';
import type { NetworkInfo } from './NetworkSelector';
import { RefreshButton } from '../Payment/RefreshButton';
import '../LandAcquisition/case_management.css';
import '../Payment/payment.css';
import {
  ViewLedgerModal,
  VoidModal,
  ledgerBadge,
  fmtTx,
  fmtDate,
} from './blockchainModals';
import type { LedgerRow } from './blockchainModals';

type ModalState = { type: 'view'; row: LedgerRow } | { type: 'void'; row: LedgerRow } | null;

export const VoidLedger: React.FC = () => {
  const [searchParams] = useSearchParams();
  const deepLink = searchParams.get('caseId');
  const [records, setRecords] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(deepLink || '');
  const [modal, setModal] = useState<ModalState>(null);
  const [caseDetailsId, setCaseDetailsId] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const { walletAddress, walletConnected, error: walletError, connectWallet } = useWallet();

  useGSAP(() => {
    gsap.fromTo('.void-header', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' });
    gsap.fromTo('.filter-bar, .action-bar, .table-wrap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'back.out(1.2)', delay: 0.2 });
  }, { scope: pageRef });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [netData, recData, paidRes, offersRes] = await Promise.all([
        blockchainApi.getNetworkInfo().catch(() => null),
        blockchainApi.getRecords(),
        paymentApi.getAllCases().catch(() => ({ cases: [] })),
        compensationApi
          .getAllOfferLetters({ status: 'ACCEPTED', limit: 200 } as any)
          .catch(() => ({ offers: [], offerLetters: [] })),
      ]);
      setNetworkInfo(netData);

      const paidMap = new Map((paidRes.cases || []).map((c: any) => [c.caseId, c]));
      const offersList: any[] = offersRes.offers || offersRes.offerLetters || [];
      const offerMap = new Map(offersList.map((o: any) => [o.caseId, o]));

      const list: LedgerRow[] = (recData.records || [])
        .filter((r: any) => r.status === 'Published' || r.status === 'PUBLISHED')
        .map((r: any) => {
          const pmt: any = paidMap.get(r.caseId);
          const off: any = offerMap.get(r.caseId);
          const ben = r.beneficiary || pmt?.beneficiary || pmt?.accountHolderName || off?.landOwnership?.landOwner?.name;
          const amt = r.amount || pmt?.amount || off?.offerAmount;
          return {
            ...r,
            publicId: r.id,
            beneficiary: ben,
            amount: amt,
            milestone: (r.milestone ?? 'AWARD') === 'AWARD' ? ('M1' as const) : ('M2' as const),
            onChainKey: r.onChainKey || `${r.caseId}#${(r.milestone ?? 'AWARD') === 'AWARD' ? 'M1' : 'M2'}`,
          };
        })
        .sort((a: any, b: any) => (a.caseId || '').localeCompare(b.caseId || ''));

      setRecords(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter(
      (r) => !q || r.caseId.toLowerCase().includes(q) || (r.transactionHash ?? '').toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const closeModal = () => setModal(null);

  return (
    <div className="main" ref={pageRef}>
      <div className="topbar void-header">
        <div className="topbar-left">
          <h1>Void Ledger Record</h1>
          <div className="sub">
            Void published records — edge cases only. Published records are immutable by design.
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

      <div className="filter-bar">
        <div className="search-wrap" style={{ flex: 1, minWidth: '300px' }}>
          <SearchInput placeholder="Search case or tx hash..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="filter-group">
          <Button variant="outlined" size="sm" onClick={() => setSearchQuery('')}>Clear</Button>
        </div>
      </div>

      <div className="action-bar">
        <div className="left">
          <Ban size={18} />
          <span className="count">{filtered.length} published {filtered.length === 1 ? 'record' : 'records'}</span>
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
                <th style={{ width: '115px' }}>Case ID</th>
                <th style={{ width: '90px' }}>Milestone</th>
                <th style={{ width: '110px' }}>Document Hash</th>
                <th style={{ width: '95px' }}>Transaction Hash</th>
                <th style={{ width: '135px' }}>Published Date</th>
                <th style={{ width: '215px', paddingRight: '20px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-8">
                    <Loader2 size={22} className="inline animate-spin" /><span className="ml-2">Loading published records…</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-8">No published records available to void.</td>
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
                  const sameCaseRecords = records.filter((r) => r.caseId === row.caseId);

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
                        }${deepLink === row.caseId ? ' bg-md-secondary-container/40' : ''}`}
                        onClick={() => setModal({ type: 'view', row })}
                      >
                        <td>
                          <div className="flex items-center gap-1.5 cursor-pointer">
                            <span className="font-mono font-bold text-xs text-md-primary" title="View Ledger Details">
                              {blockchainId}
                            </span>
                            <CopyButton value={blockchainId} title="Copy Record ID" />
                          </div>
                        </td>
                        <td><CaseIdCell caseId={row.caseId} onClick={(cid) => setCaseDetailsId(cid)} /></td>
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
                        <td style={{ paddingRight: '20px' }}>{ledgerBadge(row.status)}</td>
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
        itemLabel="records"
      />

      <div style={{ height: '32px' }} />

      <ViewLedgerModal
        row={modal?.type === 'view' ? modal.row : null}
        onClose={closeModal}
        onAction={(act, target) => {
          if (act === 'void') setModal({ type: 'void', row: target });
        }}
      />
      <VoidModal row={modal?.type === 'void' ? modal.row : null} onClose={closeModal} onDone={() => { closeModal(); loadData(); }} />
      <CaseDetailsModal caseId={caseDetailsId} onClose={() => setCaseDetailsId(null)} />
    </div>
  );
};
