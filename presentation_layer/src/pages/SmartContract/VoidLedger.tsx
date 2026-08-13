import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, User, Wallet, Loader2, Ban, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { blockchainApi } from '../../services/blockchainApi';
import { useWallet } from '../../hooks/useWallet';
import { useAdminIdentity } from '../../hooks/useAdminIdentity';
import { ActionMenuPortal } from '../../components/ui/ActionMenuPortal';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { WalletButton } from '../../components/ui/WalletButton';
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
  const { walletConnected, walletAddress, error: walletError, connectWallet } = useWallet();
  const { identityId } = useAdminIdentity();
  const [records, setRecords] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(deepLink || '');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.void-header', { opacity: 0, y: -24 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
    gsap.fromTo('.filter-bar, .table-wrap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.2)', delay: 0.2 });
  }, { scope: pageRef });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await blockchainApi.getRecords('Published');
      const mapped: LedgerRow[] = (res.records || []).map((r: any) => ({
        id: r.id,
        caseId: r.caseId,
        publicId: `FCR-${String(r.id).slice(0, 8).toUpperCase()}`,
        transactionHash: r.transactionHash,
        documentHash: r.documentHash,
        status: 'Published',
        publishedAt: r.publishedAt ?? r.createdAt,
        createdAt: r.createdAt,
        recordType: 'Original',
      }));
      setRecords(mapped);
    } catch (err: any) {
      setError(err.message || 'Failed to load published records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((r) => !q || r.caseId.toLowerCase().includes(q) || (r.transactionHash ?? '').toLowerCase().includes(q));
  }, [records, searchQuery]);

  const closeModal = () => setModal(null);

  return (
    <div className="main" ref={pageRef}>
      <div className="topbar void-header">
        <div className="topbar-left">
          <h1>Void Ledger Record</h1>
          <div className="sub">Void published records — edge cases only. Published records are immutable by design.</div>
        </div>
        <div className="topbar-right">
          {walletConnected ? (
            <WalletButton walletAddress={walletAddress || undefined} adminId={identityId} />
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
          <Button variant="tonal" size="sm" onClick={loadData}>
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
          <Button variant="outlined" size="sm" onClick={() => setSearchQuery('')}>Clear</Button>
        </div>
      </div>

      <div className="action-bar">
        <div className="left">
          <Ban size={18} />
          <span className="count">{filtered.length} published {filtered.length === 1 ? 'record' : 'records'}</span>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Case</th>
                <th>Tx Hash</th>
                <th>Published Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">
                    <Loader2 size={22} className="inline animate-spin" /><span className="ml-2">Loading published records…</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">No published records available to void.</td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className={deepLink === row.caseId ? 'bg-md-secondary-container/40' : ''}>
                    <td><span className="case-id">{row.publicId ?? row.caseId}</span></td>
                    <td><span className="meta-text">{row.caseId}</span></td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--md-on-surface-variant)' }}>{fmtTx(row.transactionHash)}</td>
                    <td><span className="meta-text">{fmtDate(row.publishedAt)}</span></td>
                    <td>{ledgerBadge(row.status)}</td>
                    <td style={{ position: 'relative' }}>
                      <ActionMenuPortal
                        isOpen={activeMenu === row.id}
                        onToggle={() => setActiveMenu(activeMenu === row.id ? null : row.id)}
                        onClose={() => setActiveMenu(null)}
                        actions={[
                          { label: 'View Details', onClick: () => setModal({ type: 'view', row }) },
                          { label: 'Void Ledger Record', onClick: () => setModal({ type: 'void', row }) },
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '24px', fontSize: '13px', color: 'var(--md-on-surface-variant)', opacity: 0.6, textAlign: 'center', borderTop: '1px solid rgba(121,116,126,0.08)', paddingTop: '18px' }}>
        FCR-SCS · Blockchain · Void · Connected to Live Backend Data
      </div>

      <ViewLedgerModal row={modal?.type === 'view' ? modal.row : null} onClose={closeModal} />
      <VoidModal row={modal?.type === 'void' ? modal.row : null} onClose={closeModal} onDone={() => { closeModal(); loadData(); }} />
    </div>
  );
};
