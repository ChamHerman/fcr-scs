import React, { useState } from 'react';
import { AlertTriangle, Lock, ShieldCheck, Wallet, Copy, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { blockchainApi } from '../../services/blockchainApi';
import { useWallet } from '../../hooks/useWallet';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useAdminIdentity } from '../../hooks/useAdminIdentity';
import { blockchainStatusClassMap } from '../Payment/statusMaps';
import { copyToClipboard } from '../../utils/clipboard';

/**
 * Shared modals for the blockchain module (PLAN_HM_1308 §5.5, §5.6, §5.7).
 * Publish/void are gated on a connected, authorised wallet; void requires a
 * mandatory reason; voided records offer flexible follow-ups (simulated per §8).
 */

export interface LedgerRow {
  id: string;
  caseId: string;
  publicId?: string;
  transactionHash?: string | null;
  documentHash?: string | null;
  status: string;
  voidReason?: string | null;
  voidTransactionHash?: string | null;
  publishedAt?: string | null;
  voidedAt?: string | null;
  createdAt?: string;
  // Derived / display-only (from the payment side)
  beneficiary?: string;
  amount?: string | number;
  recordType?: 'Original' | 'Replacement';
  certificateVersion?: number;
  followUp?: string | null;
}

export const fmtTx = (h?: string | null) =>
  h ? `${h.slice(0, 10)}…${h.slice(-6)}` : '—';

export const ledgerBadge = (status: string, extra?: string) => {
  const cls = blockchainStatusClassMap[status] ?? 'info';
  return (
    <span className={`payment-badge ${cls}`}>
      <span className="dot" />
      {extra === 'Replacement' ? 'Replacement' : status}
    </span>
  );
};

export const fmtAmount = (v?: string | number) => `RM ${Number(v || 0).toLocaleString('en-MY')}`;

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

/* ------------------------------ View Details ------------------------------ */

export const ViewLedgerModal: React.FC<{ row: LedgerRow | null; onClose: () => void }> = ({ row, onClose }) => (
  <Modal isOpen={Boolean(row)} onClose={onClose} title="Ledger Record Details" subtitle={row ? `Record ${row.publicId ?? row.caseId}` : ''} cancelText="Close">
    {row && (
      <div className="space-y-5">
        <div className="payment-detail-grid">
          <div className="payment-detail-item">
            <div className="label">Record ID</div>
            <div className="value mono">{row.publicId ?? row.caseId}</div>
          </div>
          <div className="payment-detail-item">
            <div className="label">Case</div>
            <div className="value mono">{row.caseId}</div>
          </div>
          <div className="payment-detail-item">
            <div className="label">Type</div>
            <div className="value">{row.recordType ?? 'Original'}</div>
          </div>
          <div className="payment-detail-item">
            <div className="label">Status</div>
            <div className="value">{ledgerBadge(row.status, row.recordType === 'Replacement' ? 'Replacement' : undefined)}</div>
          </div>
          <div className="payment-detail-item">
            <div className="label">Document Hash (SHA-256)</div>
            <div className="value mono" style={{ fontSize: 12 }}>{row.documentHash || '—'}</div>
          </div>
          <div className="payment-detail-item">
            <div className="label">Transaction Hash</div>
            <div className="value mono" style={{ fontSize: 12 }}>{row.transactionHash || '—'}</div>
          </div>
          <div className="payment-detail-item">
            <div className="label">Published</div>
            <div className="value">{fmtDate(row.publishedAt)}</div>
          </div>
          <div className="payment-detail-item">
            <div className="label">Voided</div>
            <div className="value">{fmtDate(row.voidedAt)}</div>
          </div>
        </div>

        {row.voidReason && (
          <div className="text-sm bg-md-error/10 border border-md-error/30 rounded-xl px-4 py-3 text-md-on-error">
            <span className="font-semibold">Void reason:</span> {row.voidReason}
          </div>
        )}
        {row.followUp && (
          <div className="text-sm bg-md-warning/10 border border-md-warning/30 rounded-xl px-4 py-3 text-md-on-warning">
            <span className="font-semibold">Follow-up recorded:</span> {row.followUp}
          </div>
        )}
      </div>
    )}
  </Modal>
);

/* ------------------------------ Publish modal ------------------------------ */

export const PublishModal: React.FC<{ row: LedgerRow | null; onClose: () => void; onDone: () => void }> = ({ row, onClose, onDone }) => {
  const { walletAddress, walletConnected, connectWallet, error: walletError } = useWallet();
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  const [resultTx, setResultTx] = useState('');

  const confirm = async () => {
    if (!row) return;
    if (!walletConnected || !walletAddress) return;
    setLoading(true);
    try {
      const res = await blockchainApi.publish({ caseId: row.caseId, documentHash: row.documentHash || '', walletAddress });
      setResultTx(res.transactionHash);
      notify({ type: 'success', title: 'Published on-chain', message: `Record for ${row.caseId} published. Tx ${fmtTx(res.transactionHash)}` });
      setTimeout(() => { onClose(); onDone(); }, 1200);
    } catch (e: any) {
      notify({ type: 'error', title: 'Publish failed', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(row)}
      onClose={onClose}
      title="Publish to Blockchain"
      subtitle={row ? `Record ${row.publicId ?? row.caseId} · ${fmtAmount(row.amount)}` : ''}
      cancelText="Cancel"
      confirmText="Confirm & Publish"
      confirmLoading={loading}
      onConfirm={confirm}
    >
      {row && (
        <div className="space-y-4">
          <div className="payment-detail-grid">
            <div className="payment-detail-item">
              <div className="label">Case</div>
              <div className="value mono">{row.caseId}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Beneficiary</div>
              <div className="value">{row.beneficiary || '—'}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Amount</div>
              <div className="value">{fmtAmount(row.amount)}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Certificate Version</div>
              <div className="value">{row.certificateVersion ?? 1}</div>
            </div>
          </div>

          <div className="payment-detail-item">
            <div className="label">Document hash (SHA-256 — read-only)</div>
            <div className="value mono" style={{ fontSize: 12 }}>{row.documentHash || '—'}</div>
          </div>

          <div className="flex items-start gap-2 text-sm bg-md-warning/10 border border-md-warning/30 rounded-xl px-4 py-3 text-md-on-warning">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            Publishing is immutable and cannot be undone. The certificate is released for download only after on-chain confirmation.
          </div>

          {!walletConnected ? (
            <div className="text-center bg-md-surface-container-low rounded-xl px-4 py-5 border border-md-outline/10">
              <p className="text-sm text-md-on-surface-variant mb-3">Connect your authorised MetaMask wallet to publish.</p>
              <Button variant="animated-primary" onClick={connectWallet}>
                <Wallet size={16} className="mr-2" /> Connect Wallet
              </Button>
              {walletError && <p className="text-xs text-md-on-error mt-2">{walletError}</p>}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm bg-md-success/10 border border-md-success/30 rounded-xl px-4 py-3 text-md-on-success">
              <ShieldCheck size={16} />
              Wallet authorised · {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
            </div>
          )}

          {resultTx && (
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

/* -------------------------------- Void modal -------------------------------- */

export const VoidModal: React.FC<{ row: LedgerRow | null; onClose: () => void; onDone: () => void }> = ({ row, onClose, onDone }) => {
  const { walletAddress, walletConnected, connectWallet, error: walletError } = useWallet();
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [followUp, setFollowUp] = useState('');

  const confirm = async () => {
    if (!row) return;
    if (!walletConnected || !walletAddress) return;
    if (!reason.trim()) return;
    setLoading(true);
    try {
      const res = await blockchainApi.voidRecord({ caseId: row.caseId, voidReason: reason.trim(), walletAddress });
      notify({ type: 'success', title: 'Record voided on-chain', message: `Void tx ${fmtTx(res.transactionHash)}` });
      setReason('');
      setFollowUp('');
      setTimeout(() => { onClose(); onDone(); }, 1200);
    } catch (e: any) {
      notify({ type: 'error', title: 'Void failed', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(row)}
      onClose={onClose}
      title="Void Ledger Record"
      subtitle={row ? `Record ${row.publicId ?? row.caseId}` : ''}
      cancelText="Cancel"
      confirmText="Confirm Void"
      confirmVariant="danger"
      confirmLoading={loading}
      onConfirm={confirm}
    >
      {row && (
        <div className="space-y-4">
          <div className="payment-detail-grid">
            <div className="payment-detail-item">
              <div className="label">Case</div>
              <div className="value mono">{row.caseId}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Tx Hash</div>
              <div className="value mono">{fmtTx(row.transactionHash)}</div>
            </div>
          </div>

          <div className="flex items-start gap-2 text-sm bg-md-warning/10 border border-md-warning/30 rounded-xl px-4 py-3 text-md-on-warning">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            Published records are immutable by design. Void exists only for genuine errors — a payment-affecting mistake or a wrong case detail that blocks the receiver.
          </div>

          <Textarea
            label="Void reason (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Mandatory legal or technical reason for voiding this record…"
          />

          <div>
            <div className="label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--md-on-surface-variant)', marginBottom: 8 }}>
              Follow-up (optional — may also be chosen later)
            </div>
            <div className="space-y-2">
              {[
                { v: 'CREATE_CORRECTED_CERTIFICATE', l: 'Create corrected certificate & republish' },
                { v: 'REOPEN_PAYMENT', l: 'Reopen payment (re-initiate → re-approve → re-pay)' },
                { v: 'KEEP_VOIDED', l: 'Keep voided (no further action)' },
              ].map((o) => (
                <label
                  key={o.v}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-md-outline/15 cursor-pointer transition-colors bg-md-surface-container-low text-sm text-md-on-surface hover:border-md-primary/40"
                >
                  <input
                    type="radio"
                    name="void-follow-up"
                    checked={followUp === o.v}
                    onChange={() => setFollowUp(o.v)}
                    className="accent-[var(--md-primary)]"
                  />
                  {o.l}
                </label>
              ))}
            </div>
          </div>

          {!walletConnected ? (
            <div className="text-center bg-md-surface-container-low rounded-xl px-4 py-5 border border-md-outline/10">
              <p className="text-sm text-md-on-surface-variant mb-3">Connect your authorised MetaMask wallet to void.</p>
              <Button variant="animated-primary" onClick={connectWallet}>
                <Wallet size={16} className="mr-2" /> Connect Wallet
              </Button>
              {walletError && <p className="text-xs text-md-on-error mt-2">{walletError}</p>}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm bg-md-success/10 border border-md-success/30 rounded-xl px-4 py-3 text-md-on-success">
              <Lock size={14} />
              Wallet authorised · {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

/* ------------------------------ Void follow-ups ------------------------------ */

export interface FollowUpChoice {
  key: 'CREATE_CORRECTED_CERTIFICATE' | 'REOPEN_PAYMENT' | 'KEEP_VOIDED';
  label: string;
}

export const FOLLOW_UP_CHOICES: FollowUpChoice[] = [
  { key: 'CREATE_CORRECTED_CERTIFICATE', label: 'Create Corrected Certificate' },
  { key: 'REOPEN_PAYMENT', label: 'Reopen Payment' },
  { key: 'KEEP_VOIDED', label: 'Keep Voided' },
];

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
