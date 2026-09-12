import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, User, Wallet, Loader2, UploadCloud, RefreshCw, Upload } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { blockchainApi } from '../../services/blockchainApi';
import { paymentApi } from '../../services/paymentApi';
import { useWallet } from '../../hooks/useWallet';
import { CaseIdCell } from '../../components/admin/CaseIdCell';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { CopyButton } from '../../components/ui/CopyButton';
import { WalletButton } from '../../components/ui/WalletButton';
import { NetworkSelector } from './NetworkSelector';
import type { NetworkInfo } from './NetworkSelector';
import '../LandAcquisition/case_management.css';
import '../Payment/payment.css';
import { normalizePaymentStatus } from '../Payment/statusMaps';
import {
  ViewLedgerModal,
  PublishModal,
  ledgerBadge,
  fmtDate,
  fmtAmount,
  computeSettlementHash,
} from './blockchainModals';
import type { LedgerRow } from './blockchainModals';

type ModalState = { type: 'view'; row: LedgerRow } | { type: 'publish'; row: LedgerRow } | null;

export const PublishLedger: React.FC = () => {
  const [searchParams] = useSearchParams();
  const deepLink = searchParams.get('caseId');
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(deepLink || '');
  const [modal, setModal] = useState<ModalState>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const { walletAddress, walletConnected, error: walletError, connectWallet } = useWallet();

  useGSAP(() => {
    gsap.fromTo('.publish-header', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' });
    gsap.fromTo('.filter-bar, .action-bar, .table-wrap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'back.out(1.2)', delay: 0.2 });
  }, { scope: pageRef });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [netData, allCases, recordsRes] = await Promise.all([
        blockchainApi.getNetworkInfo().catch(() => null),
        paymentApi.getAllCases().catch(() => ({ cases: [] })),
        blockchainApi.getRecords().catch(() => ({ records: [] })),
      ]);

      setNetworkInfo(netData);

      const publishedMap = new Map<string, any>();
      (recordsRes.records || []).forEach((r: any) => publishedMap.set(r.caseId, r));

      const readyList: LedgerRow[] = [];
      for (const pc of (allCases.cases || [])) {
        if (normalizePaymentStatus(pc.status) === 'Paid') {
          const rec = publishedMap.get(pc.caseId);
          if (!rec) {
            const docHash = await computeSettlementHash(pc.caseId, pc.amount);
            readyList.push({
              id: pc.id,
              caseId: pc.caseId,
              // No FCR record exists yet — show the payment's PMT-XXXXXXXX id
              publicId: pc.paymentId || pc.id,
              beneficiary: pc.accountHolderName || pc.beneficiaryId,
              amount: pc.amount,
              status: 'Ready to Publish',
              documentHash: docHash,
              certificateVersion: 1,
            });
          }
        }
      }
      setRows(readyList);
    } catch (err: any) {
      setError(err.message || 'Failed to load publish queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => !q || r.caseId.toLowerCase().includes(q) || (r.beneficiary ?? '').toLowerCase().includes(q));
  }, [rows, searchQuery]);

  const closeModal = () => setModal(null);

  return (
    <div className="main" ref={pageRef}>
      <div className="topbar publish-header">
        <div className="topbar-left">
          <h1>Publish to Ledger</h1>
          <div className="sub">
            Records ready to be published on-chain — derived from payment + certificate state.
          </div>
        </div>
        <div className="topbar-right flex items-center gap-3">
          <NetworkSelector networkInfo={networkInfo} onNetworkChange={(net) => setNetworkInfo(net)} />
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
          <SearchInput placeholder="Search case, beneficiary or amount..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="filter-group">
          <Button variant="tonal" size="sm" onClick={loadData}>
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
          <Button variant="outlined" size="sm" onClick={() => setSearchQuery('')}>Clear</Button>
        </div>
      </div>

      <div className="action-bar">
        <div className="left">
          <UploadCloud size={18} />
          <span className="count">{filtered.length} record{filtered.length === 1 ? '' : 's'} ready to publish</span>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Case</th>
                <th>Beneficiary</th>
                <th>Amount</th>
                <th>Certificate Version</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-8">
                    <Loader2 size={22} className="inline animate-spin" /><span className="ml-2">Loading publish queue…</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-8">Nothing ready to publish right now.</td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className={`row-clickable${deepLink === row.caseId ? ' bg-md-secondary-container/40' : ''}`}
                    onClick={() => setModal({ type: 'view', row })}
                  >
                    <td>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <span className="font-mono font-bold text-xs text-md-primary">
                          {row.publicId ?? row.caseId}
                        </span>
                        <CopyButton value={row.publicId ?? row.caseId} title="Copy Record ID" />
                      </div>
                    </td>
                    <td><CaseIdCell caseId={row.caseId} /></td>
                    <td>{row.beneficiary || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{fmtAmount(row.amount)}</td>
                    <td><span className="meta-text">v{row.certificateVersion ?? 1}</span></td>
                    <td>{ledgerBadge(row.status)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        <Button
                          size="sm"
                          variant="filled"
                          className="h-8 px-3.5 text-xs inline-flex items-center gap-2 rounded-full font-medium"
                          onClick={() => setModal({ type: 'publish', row })}
                        >
                          <Upload size={13} className="shrink-0" />
                          <span>Publish</span>
                        </Button>
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
        FCR-SCS · Blockchain · Publish · Connected to Live Backend Data
      </div>

      <ViewLedgerModal row={modal?.type === 'view' ? modal.row : null} onClose={closeModal} />
      <PublishModal row={modal?.type === 'publish' ? modal.row : null} onClose={closeModal} onDone={() => { closeModal(); loadData(); }} />
    </div>
  );
};
