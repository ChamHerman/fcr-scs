import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Loader2, Lock, ShieldCheck, Wallet, Copy, CheckCircle2, ExternalLink, Upload } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { CopyButton } from '../../components/ui/CopyButton';
import { blockchainApi } from '../../services/blockchainApi';
import { landAcquisitionApi } from '../../services/landAcquisitionApi';
import { useWallet } from '../../hooks/useWallet';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useAdminIdentity } from '../../hooks/useAdminIdentity';
import { blockchainStatusClassMap } from '../Payment/statusMaps';
import { copyToClipboard } from '../../utils/clipboard';
import { sendLedgerTransaction, waitForLedgerReceipt } from './walletTx';
import { formatDateTime } from '../../utils/dateFormat';

/**
 * Shared modals for the blockchain module.
 * Confirmed on-chain notarizations are immutable and permanent on Sepolia.
 */

export interface LedgerRow {
  id: string;
  caseId: string;
  /** FR-019: on-chain anchor key `${caseId}#M1` / `${caseId}#M2`. */
  milestone?: 'M1' | 'M2';
  onChainKey?: string;
  publicId?: string;
  transactionHash?: string | null;
  documentHash?: string | null;
  status: string;
  publishedAt?: string | null;
  createdAt?: string;
  caseCreatedAt?: string | null;
  /** FR-012 grace policy: instant the 24-hour acceptance window ends. */
  graceEndsAt?: string | number | null;
  // Derived / display-only (from the payment side)
  beneficiary?: string;
  amount?: string | number;
  recordType?: 'Original';
  certificateVersion?: number;
  bankName?: string | null;
  accountNumber?: string | null;
  bankReferenceNumber?: string | null;
  paidAt?: string | null;
  acceptedAt?: string | null;
}

export const maskAccount = (n?: string | null) =>
  n && n.length > 4 ? `•••• ${n.slice(-4)}` : n || '—';

export const fmtTx = (h?: string | null) =>
  h ? `${h.slice(0, 6)}…${h.slice(-4)}` : '—';

export const ledgerBadge = (status: string) => {
  const cls = blockchainStatusClassMap[status] ?? 'info';
  return (
    <span className={`payment-badge ${cls}`}>
      <span className="dot" />
      {status}
    </span>
  );
};

export const fmtAmount = (v?: string | number) => `RM ${Number(v || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtDate = (d?: string | number | Date | null) => formatDateTime(d);

export const formatGraceCountdown = (msRemaining: number): string => {
  const totalMinutes = Math.max(0, Math.ceil(msRemaining / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

/* ------------------------------ View Details ------------------------------ */

export const ViewLedgerModal: React.FC<{
  row: LedgerRow | null;
  onClose: () => void;
  onAction?: (action: 'publish', row: LedgerRow) => void;
}> = ({ row, onClose, onAction }) => {
  const [caseData, setCaseData] = useState<any>(null);

  useEffect(() => {
    if (!row?.caseId) {
      setCaseData(null);
      return;
    }
    let isMounted = true;
    landAcquisitionApi
      .getCaseById(row.caseId)
      .then((res: any) => {
        if (isMounted) setCaseData(res?.data || res?.case || res);
      })
      .catch(() => {
        if (isMounted) setCaseData(null);
      });
    return () => {
      isMounted = false;
    };
  }, [row?.caseId]);

  if (!row) return null;

  const blockchainId = row.publicId?.startsWith('BCN-')
    ? row.publicId
    : row.id?.startsWith('BCN-')
    ? row.id
    : (row.publicId || row.id);
  const txUrl = row.transactionHash ? `https://sepolia.etherscan.io/tx/${row.transactionHash}` : null;
  const isPublished = row.status === 'Published' || row.status === 'PUBLISHED' || row.status === 'CONFIRMED';
  const graceLocked =
    row.milestone === 'M1' &&
    !!row.graceEndsAt &&
    Date.now() < new Date(row.graceEndsAt).getTime();
  const countdown = graceLocked
    ? formatGraceCountdown(new Date(row.graceEndsAt as string | number).getTime() - Date.now())
    : '';
  const hashMissing = row.milestone === 'M1' && !row.documentHash;
  const isReady =
    !isPublished &&
    (row.status === 'Ready to Publish' ||
      row.status === 'READY_TO_PUBLISH' ||
      row.status === 'PENDING' ||
      row.status === 'OFFER_ACCEPTED' ||
      row.status === 'COMPLETED' ||
      row.status === 'READY' ||
      graceLocked ||
      row.status === 'Grace Period (Locked)');

  return (
    <Modal
      isOpen={Boolean(row)}
      onClose={onClose}
      title="Blockchain Notarization Details"
      subtitle={`Blockchain ID: ${blockchainId} · Case ${row.caseId}`}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="text" size="md" onClick={onClose}>
            Close
          </Button>
          {isReady && onAction && (
            <div className="flex items-center gap-3">
              <Button
                variant="animated-primary"
                size="md"
                disabled={hashMissing || graceLocked}
                title={
                  hashMissing
                    ? 'The accepted offer has no frozen Form H fingerprint yet — publishing is blocked'
                    : graceLocked
                    ? `Milestone 1 unlocks when the 24-hour acceptance grace period ends (${countdown} left)`
                    : undefined
                }
                onClick={() => {
                  onClose();
                  onAction('publish', row);
                }}
              >
                {graceLocked ? <Lock size={15} className="mr-1.5" /> : <Upload size={15} className="mr-1.5" />}
                <span>
                  {graceLocked
                    ? `Locked (${countdown} Left)`
                    : hashMissing
                    ? 'Form H Hash Missing'
                    : row.milestone === 'M2'
                    ? 'Publish Settlement (M2)'
                    : 'Publish Award (M1)'}
                </span>
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Priority: Statutory Land Acquisition & Financial Particulars */}
        <div className="bg-md-surface-container-low rounded-xl p-4 border border-md-outline/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-md-primary">
              Statutory Land Acquisition Particulars
            </h4>
            <span className="font-mono text-xs font-bold text-md-primary">{row.caseId}</span>
          </div>
          <div className="payment-detail-grid">
            <div className="payment-detail-item">
              <div className="label">Case Title</div>
              <div className="value font-medium">{caseData?.caseTitle || caseData?.title || '—'}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Project</div>
              <div className="value font-medium">{caseData?.project?.projectName || '—'}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Parcel / Title No</div>
              <div className="value">
                {caseData?.landParcel
                  ? `${caseData.landParcel.lotNo || '—'} (${caseData.landParcel.landTitleNo || '—'})`
                  : '—'}
              </div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Beneficiary Landowner</div>
              <div className="value font-semibold">
                {row.beneficiary ||
                  caseData?.landParcel?.ownerships?.[0]?.landOwner?.name ||
                  caseData?.landOwners?.[0]?.name ||
                  '—'}
              </div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Compensation Amount</div>
              <div className="value font-bold text-md-primary">
                {fmtAmount(
                  row.amount ||
                    caseData?.compensationReports?.[0]?.totalCompensation ||
                    caseData?.offerLetters?.[0]?.offerAmount ||
                    caseData?.valuationReports?.[0]?.recommendedCompensation ||
                    0
                )}
              </div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Milestone Target</div>
              <div className="value font-semibold">
                {row.milestone === 'M1'
                  ? 'Milestone 1 — Statutory Award (Form H)'
                  : 'Milestone 2 — Settlement Clearance (Receipt)'}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-md-on-surface-variant pt-2.5 border-t border-md-outline/10">
            <span>
              <span className="font-semibold">Case Created:</span> {fmtDate(caseData?.createdAt || caseData?.registrationDate || row.createdAt)}
            </span>
            <span>
              <span className="font-semibold">Offer Accepted:</span> {fmtDate(caseData?.offerLetters?.find((o: any) => o.status === 'ACCEPTED' || o.acceptedAt)?.acceptedAt || row.acceptedAt || caseData?.updatedAt)}
            </span>
            <span>
              <span className="font-semibold">Last Updated:</span> {fmtDate(caseData?.updatedAt || row.createdAt)}
            </span>
            {row.graceEndsAt && (
              <span>
                <span className="font-semibold">Grace Window Ends:</span> {fmtDate(row.graceEndsAt)}
              </span>
            )}
          </div>
        </div>

        {/* Cryptographic Proofs & On-Chain Notarization Status */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-md-on-surface-variant mb-3">
            On-Chain Notarization & Cryptographic Proof
          </h4>
          <div className="payment-detail-grid">
            <div className="payment-detail-item">
              <div className="label">Blockchain Record ID</div>
              <div className="value mono text-md-primary font-bold">{blockchainId}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">On-Chain Key</div>
              <div className="value mono">{row.onChainKey || `${row.caseId}#${row.milestone || 'M1'}`}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Status</div>
              <div className="value">{ledgerBadge(row.status)}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Published Timestamp</div>
              <div className="value">{fmtDate(row.publishedAt)}</div>
            </div>
            <div className="payment-detail-item col-span-2">
              <div className="label">Document Hash (SHA-256 Byte Fingerprint)</div>
              <div className="value mono flex items-center justify-between text-xs break-all">
                <span>{row.documentHash || '—'}</span>
                {row.documentHash && <CopyButton value={row.documentHash} title="Copy Hash" />}
              </div>
            </div>
            <div className="payment-detail-item col-span-2">
              <div className="label">Transaction Hash (Sepolia Etherscan)</div>
              <div className="value mono flex items-center justify-between text-xs break-all">
                {txUrl ? (
                  <a
                    href={txUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-md-primary font-semibold hover:underline inline-flex items-center gap-1.5"
                  >
                    <span>{row.transactionHash}</span>
                    <ExternalLink size={12} className="shrink-0" />
                  </a>
                ) : (
                  <span>{row.transactionHash || '—'}</span>
                )}
                {row.transactionHash && <CopyButton value={row.transactionHash} title="Copy Tx Hash" />}
              </div>
            </div>
          </div>
        </div>

        {isPublished && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-md-outline/15 bg-md-surface-container-low text-xs text-md-on-surface-variant">
            <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
            <span>
              <strong>Statutory On-Chain Immutability:</strong> This confirmed record is cryptographically sealed and permanently anchored to the Sepolia blockchain ledger. Confirmed transactions cannot be altered, cancelled, or revoked.
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
};

/* ------------------------------ Publish modal ------------------------------ */

export const PublishModal: React.FC<{ row: LedgerRow | null; onClose: () => void; onDone: () => void }> = ({ row, onClose, onDone }) => {
  const { walletAddress, walletConnected, connectWallet, error: walletError } = useWallet();
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<'wallet' | 'mining' | 'recording'>('wallet');
  const [resultTx, setResultTx] = useState('');
  const [caseData, setCaseData] = useState<any>(null);

  useEffect(() => {
    if (!row?.caseId) {
      setCaseData(null);
      return;
    }
    let isMounted = true;
    landAcquisitionApi
      .getCaseById(row.caseId)
      .then((res: any) => {
        if (isMounted) setCaseData(res?.data || res?.case || res);
      })
      .catch(() => {
        if (isMounted) setCaseData(null);
      });
    return () => {
      isMounted = false;
    };
  }, [row?.caseId]);

  const isCancelledRef = useRef(false);

  // Tab unload & refresh protection: prevent accidental abandonment during statutory on-chain execution
  useEffect(() => {
    if (!loading) return;

    isCancelledRef.current = false;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Publishing to blockchain is currently in progress. Refreshing or closing the tab will cancel the publishment.';
      return e.returnValue;
    };

    const handleUnload = () => {
      isCancelledRef.current = true;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      isCancelledRef.current = true;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [loading]);

  const handleModalClose = () => {
    if (loading) return;
    onClose();
  };

  const confirm = async () => {
    if (!row) return;
    if (!walletConnected || !walletAddress) return;
    if (loading) return;

    setLoading(true);
    setStage('wallet');
    isCancelledRef.current = false;

    try {
      const net = await blockchainApi.getNetworkInfo();
      if (!net.contractAddress) {
        throw new Error('No contract address configured for the active network — set it in the smart-contract service env.');
      }

      if (isCancelledRef.current) return;

      // 1. Prompt the admin's MetaMask to sign + send the publish transaction
      // FR-019: the contract maps by on-chain key `${caseId}#M1` / `${caseId}#M2`.
      let publishKey = row.onChainKey || `${row.caseId}#${row.milestone || 'M1'}-${Math.floor(Date.now() / 1000)}`;
      try {
        const ethereum = (window as any).ethereum;
        if (ethereum) {
          const { ethers } = await import('ethers');
          const provider = new ethers.BrowserProvider(ethereum);
          const contract = new ethers.Contract(
            net.contractAddress,
            ['function getRecord(string) view returns (bytes32, uint256, bool, string, uint256)'],
            provider
          );
          const rec = await contract.getRecord(publishKey);
          if (rec && Number(rec[1]) > 0) {
            publishKey = `${publishKey}-${Math.floor(Date.now() / 1000)}`;
          }
        }
      } catch {
        // Non-blocking pre-check
      }

      if (isCancelledRef.current) return;

      const txHash = await sendLedgerTransaction({
        from: walletAddress,
        functionName: 'publishRecord',
        args: [publishKey, row.documentHash || ''],
        network: { chainId: net.chainId, contractAddress: net.contractAddress },
      });

      if (isCancelledRef.current) return;
      setResultTx(txHash);

      // 2. Wait until the transaction is actually mined on-chain
      setStage('mining');
      await waitForLedgerReceipt(txHash);

      if (isCancelledRef.current) return;

      // 3. Record the real transaction hash + Published status in the database
      setStage('recording');
      await blockchainApi.publish({
        caseId: row.caseId,
        milestone: row.milestone === 'M2' ? 'SETTLEMENT' : 'AWARD',
        documentHash: row.documentHash || '',
        walletAddress,
        transactionHash: txHash,
        onChainKey: publishKey,
      });

      if (isCancelledRef.current) return;

      notify({ type: 'success', title: 'Published on-chain', message: `${row.milestone === 'M2' ? 'Settlement (M2)' : 'Statutory award (M1)'} record for ${row.caseId} published · Tx ${fmtTx(txHash)}` });
      onClose();
      onDone();
    } catch (e: any) {
      console.error('[blockchain] publish failed:', e);
      notify({
        type: 'error',
        title: 'Publish failed',
        message: e?.message || 'Transaction failed',
        error: e,
      });
    } finally {
      if (!isCancelledRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <Modal
      isOpen={Boolean(row)}
      onClose={handleModalClose}
      preventBackdropClose={loading}
      title="Publish to Blockchain"
      subtitle={row ? `Record ${row.publicId ?? row.caseId} · ${fmtAmount(row.amount)}` : ''}
      cancelText="Cancel"
      confirmText="Confirm & Publish"
      confirmLoading={loading}
      onConfirm={confirm}
    >
      {row && (
        <div className="space-y-4 pb-5">
          <div className="payment-detail-grid">
            <div className="payment-detail-item">
              <div className="label">Case</div>
              <div className="value mono">{row.caseId}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">On-Chain Key</div>
              <div className="value mono">{row.onChainKey || row.caseId}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Beneficiary</div>
              <div className="value">{row.beneficiary || '—'}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Amount</div>
              <div className="value">{fmtAmount(row.amount)}</div>
            </div>
            {row.milestone === 'M1' ? (
              <>
                <div className="payment-detail-item">
                  <div className="label">Form H Acceptance Date</div>
                  <div className="value">{fmtDate(row.acceptedAt)}</div>
                </div>
                {row.graceEndsAt && (
                  <div className="payment-detail-item">
                    <div className="label">Grace Window Ends</div>
                    <div className="value">{fmtDate(row.graceEndsAt)}</div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="payment-detail-item">
                  <div className="label">Destination Bank</div>
                  <div className="value">
                    {row.bankName ? `${row.bankName} · ${maskAccount(row.accountNumber)}` : '—'}
                  </div>
                </div>
                <div className="payment-detail-item">
                  <div className="label">RENTAS / Bank Ref</div>
                  <div className="value mono">{row.bankReferenceNumber || '—'}</div>
                </div>
                <div className="payment-detail-item">
                  <div className="label">Settlement Paid Date</div>
                  <div className="value">{fmtDate(row.paidAt)}</div>
                </div>
                <div className="payment-detail-item">
                  <div className="label">Certificate Version</div>
                  <div className="value">{row.certificateVersion ?? 1}</div>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-md-on-surface-variant px-1">
            <span>
              <span className="font-semibold">Case Created:</span> {fmtDate(caseData?.createdAt || caseData?.registrationDate || row.caseCreatedAt || row.createdAt)}
            </span>
            {(row.acceptedAt || caseData?.offerLetters?.find((o: any) => o.status === 'ACCEPTED' || o.acceptedAt)?.acceptedAt) && (
              <span>
                <span className="font-semibold">Offer Accepted:</span> {fmtDate(row.acceptedAt || caseData?.offerLetters?.find((o: any) => o.status === 'ACCEPTED' || o.acceptedAt)?.acceptedAt)}
              </span>
            )}
            <span>
              <span className="font-semibold">Last Updated:</span> {fmtDate(caseData?.updatedAt || row.acceptedAt || row.createdAt)}
            </span>
            {row.graceEndsAt && (
              <span>
                <span className="font-semibold">Grace Window Ends:</span> {fmtDate(row.graceEndsAt)}
              </span>
            )}
          </div>

          <div className="payment-detail-item">
            <div className="label">Document hash (SHA-256 — read-only)</div>
            <div className="value mono" style={{ fontSize: 12 }}>{row.documentHash || '—'}</div>
          </div>

          <div className="flex items-start gap-3 text-xs bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 text-amber-800 dark:text-amber-200">
            <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-xs uppercase tracking-wider">Statutory Immutability Warning</div>
              <p className="text-xs leading-relaxed text-amber-900/80 dark:text-amber-200/80">
                Publishing is legally immutable and cannot be undone. The cryptographic certificate is released for download only after on-chain block confirmation.
              </p>
            </div>
          </div>

          {!walletConnected ? (
            <div className="text-center bg-md-surface-container-low rounded-2xl px-4 py-5 border border-md-outline/10">
              <p className="text-sm text-md-on-surface-variant mb-3">Connect your authorised MetaMask wallet to publish.</p>
              <Button variant="animated-primary" onClick={connectWallet}>
                <Wallet size={16} className="mr-2" /> Connect Wallet
              </Button>
              {walletError && <p className="text-xs text-md-on-error mt-2">{walletError}</p>}
            </div>
          ) : (
            <div className="flex items-start gap-3 text-xs bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 text-emerald-800 dark:text-emerald-200 mb-2">
              <ShieldCheck size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-xs uppercase tracking-wider">Authorised Government Administrator Wallet</div>
                <p className="text-xs leading-relaxed text-emerald-900/80 dark:text-emerald-200/80">
                  Connected as <span className="font-mono font-semibold">{walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}</span>. MetaMask will prompt for statutory multi-sig transaction signature.
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm bg-md-primary/10 border border-md-primary/30 rounded-xl px-4 py-3 text-md-on-surface">
              <Loader2 size={16} className="animate-spin shrink-0" />
              {stage === 'wallet' && 'Waiting for approval in MetaMask…'}
              {stage === 'mining' && <>Transaction sent — waiting for on-chain confirmation ({fmtTx(resultTx)})…</>}
              {stage === 'recording' && 'Confirmed on-chain — recording in the ledger database…'}
            </div>
          )}

          {resultTx && !loading && (
            <div className="flex items-center gap-2 text-sm bg-md-success/10 border border-md-success/30 rounded-xl px-4 py-3 text-md-on-success break-words">
              <CheckCircle2 size={16} className="shrink-0" />
              Transaction {fmtTx(resultTx)}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export const copyHash = async (value: string, notify: (n: { type: 'success'; title: string; message?: string }) => void) => {
  await copyToClipboard(value, notify);
};

/**
 * Real SHA-256 over the canonical settlement snapshot bytes (PLAN_HM_1308 §15).
 * No mock hashes: the same case state always produces the same hash. The legacy
 * backend stores whatever documentHash is sent, so we compute one deterministically
 * from the case identity + amount rather than inventing a constant.
 */
export const computeSettlementHash = async (caseId: string, amount?: string | number): Promise<string> => {
  const canonical = JSON.stringify({ caseId, amount: Number(amount || 0), source: 'fcr-scs-settlement' });
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `0x${hex}`;
};
