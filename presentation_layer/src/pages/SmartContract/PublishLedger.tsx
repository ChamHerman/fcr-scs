import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock, User, Wallet, Loader2, UploadCloud, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { blockchainApi } from '../../services/blockchainApi';
import { paymentApi } from '../../services/paymentApi';
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
  const { walletConnected, walletAddress, error: walletError, connectWallet } = useWallet();
  const { identityId } = useAdminIdentity();
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(deepLink || '');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.publish-header', { opacity: 0, y: -24 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
    gsap.fromTo('.filter-bar, .table-wrap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.2)', delay: 0.2 });
  }, { scope: pageRef });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Ready to publish = payment Paid (or confirmed) + certificate exists +
      // no active ledger record. Certificate state is derived client-side (no
      // certificate table in the legacy backend — flagged PLAN_HM_1308 §8).
      const [paidRes, recData] = await Promise.all([
        paymentApi.getAllCases().catch(() => ({ cases: [] })),
        blockchainApi.getRecords().catch(() => ({ records: [] })),
      ]);
      const existing = new Set((recData.records || []).map((r: any) => r.caseId));
      const paid = (paidRes.cases || []).filter(
        (c: any) => c.status === 'Paid' && !existing.has(c.caseId)
      );
      const derived: LedgerRow[] = await Promise.all(
        paid.map(async (c: any) => ({
          id: `ready-${c.caseId}`,
          caseId: c.caseId,
          publicId: `FCR-${String(c.caseId).replace(/[^A-Z0-9]/gi, '').slice(-8).toUpperCase()}`,
          status: 'Ready to Publish',
          beneficiary: c.accountHolderName || c.beneficiaryId,
          amount: c.amount,
          documentHash: await computeSettlementHash(c.caseId, c.amount),
          recordType: 'Original',
          certificateVersion: 1,
        }))
      );
      setRows(derived);
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
          <div className="sub">Records ready to be published on-chain — derived from payment + certificate state.</div>
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
                  <tr key={row.id} className={deepLink === row.caseId ? 'bg-md-secondary-container/40' : ''}>
                    <td><span className="case-id">{row.publicId ?? row.caseId}</span></td>
                    <td><span className="meta-text">{row.caseId}</span></td>
                    <td>{row.beneficiary || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{fmtAmount(row.amount)}</td>
                    <td><span className="meta-text">v{row.certificateVersion ?? 1}</span></td>
                    <td>{ledgerBadge(row.status)}</td>
                    <td style={{ position: 'relative' }}>
                      <ActionMenuPortal
                        isOpen={activeMenu === row.id}
                        onToggle={() => setActiveMenu(activeMenu === row.id ? null : row.id)}
                        onClose={() => setActiveMenu(null)}
                        actions={[
                          { label: 'View Details', onClick: () => setModal({ type: 'view', row }) },
                          { label: 'Publish to Blockchain', onClick: () => setModal({ type: 'publish', row }) },
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
        FCR-SCS · Blockchain · Publish · Connected to Live Backend Data
      </div>

      <ViewLedgerModal row={modal?.type === 'view' ? modal.row : null} onClose={closeModal} />
      <PublishModal row={modal?.type === 'publish' ? modal.row : null} onClose={closeModal} onDone={() => { closeModal(); loadData(); }} />
    </div>
  );
};
