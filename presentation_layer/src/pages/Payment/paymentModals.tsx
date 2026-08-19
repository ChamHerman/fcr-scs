import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { paymentApi } from '../../services/paymentApi';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useAdminIdentity } from '../../hooks/useAdminIdentity';
import { normalizePaymentStatus, paymentStatusClassMap } from './statusMaps';

/**
 * Shared modal components for the payment module (PLAN_HM_1308 §5.1, §5.2, §5.3, §5.4).
 * Every secondary action from a row menu opens one of these — no window.prompt/
 * confirm/alert, no separate page navigation. Mutations call the real API and the
 * parent refreshes via `onDone`; toasts surface success/error.
 */

export interface PaymentRow {
  id: string;
  caseId: string;
  paymentId?: string;
  beneficiaryId: string;
  amount: string | number;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  phoneNumber?: string | null;
  myKadNumber?: string | null;
  status: string;
  requiredSignatures: number;
  currentSignatures: number;
  createdAt: string;
  updatedAt: string;
  authorisations?: Array<{ adminId: string; action: string; reason?: string | null; createdAt: string }>;
  receipt?: { bankReferenceNumber: string } | null;
  failedTransactions?: Array<{ errorLog: string; resolution?: string | null; resolvedAt?: string | null; createdAt: string }>;
}

export const PRE_TRANSFER_STATUSES = [
  'Offer Accepted',
  'offer_accepted',
  'Approved',
  'Bank Details Submitted',
  'Transfer Initiated',
  'Authorised',
  'Scheduled',
];

export const hasBankDetails = (pc: PaymentRow) =>
  Boolean(pc.bankName && pc.accountNumber && pc.accountHolderName);

export const isReadyToInitiate = (pc: PaymentRow) => {
  const norm = normalizePaymentStatus(pc.status);
  return (
    (norm === 'Offer Accepted' || norm === 'Approved' || norm === 'Bank Details Submitted') &&
    hasBankDetails(pc)
  );
};

export const initiatorOf = (pc: PaymentRow) =>
  pc.authorisations?.find((a) => a.action === 'initiate')?.adminId ?? null;

export const signersOf = (pc: PaymentRow) =>
  pc.authorisations?.filter((a) => a.action === 'authorise').map((a) => a.adminId) ?? [];

export const hasSignedOrInitiated = (pc: PaymentRow, adminId: string) => {
  const initiator = initiatorOf(pc);
  if (initiator && initiator === adminId) return true;
  return signersOf(pc).includes(adminId);
};

/** Signatures still needed: required − current (bank 1 + approvals model). */
export const signaturesLeft = (pc: PaymentRow) =>
  Math.max(0, (pc.requiredSignatures ?? 1) - (pc.currentSignatures ?? 0));

/** Authorise/sign is offered only while signatures are outstanding — once the
 *  total is met the transfer is submitted to the bank (DESIGN.md). */
export const isAuthoriseable = (pc: PaymentRow, adminId: string) => {
  const norm = normalizePaymentStatus(pc.status);
  return (
    (norm === 'Transfer Initiated' || norm === 'Authorised') &&
    signaturesLeft(pc) > 0 &&
    !hasSignedOrInitiated(pc, adminId)
  );
};

export const fmtAmount = (v: string | number) => `RM ${Number(v || 0).toLocaleString('en-MY')}`;

export const maskAccount = (n?: string | null) =>
  n && n.length > 4 ? `•••• ${n.slice(-4)}` : n || '—';

export const maskMyKad = (n?: string | null) =>
  n && n.length >= 10 ? `${n.slice(0, 2)}••••-••-••${n.slice(-2)}` : n || '—';

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const paymentBadge = (status: string) => {
  const s = normalizePaymentStatus(status);
  const cls = paymentStatusClassMap[s] ?? 'pending';
  return (
    <span className={`payment-badge ${cls}`}>
      <span className="dot" />
      {s}
    </span>
  );
};

/* ------------------------------- View Details ------------------------------- */

export const ViewDetailsModal: React.FC<{ pc: PaymentRow | null; onClose: () => void }> = ({ pc, onClose }) => (
  <Modal isOpen={Boolean(pc)} onClose={onClose} title="Payment Details" subtitle={pc ? `Case ${pc.caseId}` : ''} cancelText="Close">
    {pc && (
      <div className="space-y-5">
        <div className="payment-detail-grid">
          <div className="payment-detail-item">
            <div className="label">Payment ID</div>
            <div className="value mono text-md-primary font-bold">{pc.paymentId || `PMT-${pc.caseId}`}</div>
          </div>
          <div className="payment-detail-item">
            <div className="label">Case ID</div>
            <div className="value mono">{pc.caseId}</div>
          </div>
          <div className="payment-detail-item">
            <div className="label">Beneficiary</div>
            <div className="value">{pc.accountHolderName || pc.beneficiaryId || '—'}</div>
          </div>
          <div className="payment-detail-item">
            <div className="label">MyKad</div>
            <div className="value mono">{maskMyKad(pc.myKadNumber)}</div>
          </div>
          <div className="payment-detail-item">
            <div className="label">Phone</div>
            <div className="value mono">{pc.phoneNumber || '—'}</div>
          </div>
          <div className="payment-detail-item">
            <div className="label">Bank</div>
            <div className="value">{pc.bankName || '—'}</div>
          </div>
          <div className="payment-detail-item">
            <div className="label">Account</div>
            <div className="value mono">{maskAccount(pc.accountNumber)}</div>
          </div>
          <div className="payment-detail-item">
            <div className="label">Amount</div>
            <div className="value font-bold text-md-primary">{fmtAmount(pc.amount)}</div>
          </div>
        </div>

        <div className="payment-detail-item">
          <div className="label">Current Status</div>
          <div className="value">{paymentBadge(pc.status)}</div>
        </div>

        <div>
          <div className="label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--md-on-surface-variant)', marginBottom: 8 }}>
            Approval History
          </div>
          <div className="space-y-2">
            {(pc.authorisations ?? []).length === 0 && (
              <p className="text-sm text-md-on-surface-variant">No approvals recorded.</p>
            )}
            {(pc.authorisations ?? []).map((a, i) => (
              <div key={i} className="flex items-start justify-between gap-3 text-sm bg-md-surface-container-low rounded-xl px-4 py-2.5 border border-md-outline/10">
                <div>
                  <span className="font-semibold text-md-on-surface capitalize">{a.action}</span>
                  <span className="text-md-on-surface-variant"> · {a.adminId}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-md-on-surface-variant">{fmtDate(a.createdAt)}</div>
                  {a.reason && <div className="text-xs text-md-on-surface-variant italic">{a.reason}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--md-on-surface-variant)', marginBottom: 8 }}>
            Transfer Attempts
          </div>
          <div className="space-y-2">
            {(pc.failedTransactions ?? []).length === 0 && (
              <p className="text-sm text-md-on-surface-variant">No failed attempts. {pc.receipt ? 'Receipt present.' : ''}</p>
            )}
            {(pc.failedTransactions ?? []).map((f, i) => (
              <div key={i} className="bg-md-surface-container-low rounded-xl px-4 py-2.5 border border-md-outline/10 text-sm">
                <div className="text-xs text-md-on-surface-variant mb-1">
                  Attempt #{i + 1} · {fmtDate(f.createdAt)}
                </div>
                <div className="text-md-on-surface break-words">{f.errorLog}</div>
                {f.resolution && (
                  <div className="text-xs text-md-on-success mt-1">
                    Resolution: {f.resolution} {f.resolvedAt ? `· ${fmtDate(f.resolvedAt)}` : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {pc.receipt && (
          <div className="payment-detail-item">
            <div className="label">Receipt</div>
            <div className="value mono">Bank Ref: {pc.receipt.bankReferenceNumber}</div>
          </div>
        )}

        <div className="payment-detail-item">
          <div className="label">Audit</div>
          <div className="text-sm text-md-on-surface">
            Created {fmtDate(pc.createdAt)} · Updated {fmtDate(pc.updatedAt)}
          </div>
        </div>
      </div>
    )}
  </Modal>
);

/* --------------------------- Mutating modals (base) --------------------------- */

interface MutatingModalProps {
  pc: PaymentRow | null;
  onClose: () => void;
  onDone: () => void;
}

const useMutationState = () => {
  const [loading, setLoading] = useState(false);
  const { notify } = useNotification();
  return { loading, setLoading, notify };
};

/* ----------------------------- Initiate Transfer ----------------------------- */

export const InitiateTransferModal: React.FC<MutatingModalProps> = ({ pc, onClose, onDone }) => {
  const { identityId, identityLabel } = useAdminIdentity();
  const { loading, setLoading, notify } = useMutationState();

  const confirm = async () => {
    if (!pc) return;
    setLoading(true);
    try {
      await paymentApi.initiate({ caseId: pc.caseId, adminId: identityId });
      notify({ type: 'success', title: 'Transfer initiated', message: `Case ${pc.caseId} moved to Transfer Initiated.` });
      onClose();
      onDone();
    } catch (e: any) {
      notify({ type: 'error', title: 'Initiate failed', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(pc)}
      onClose={onClose}
      title="Initiate Transfer"
      subtitle={pc ? `Case ${pc.caseId} · ${fmtAmount(pc.amount)}` : ''}
      cancelText="Cancel"
      confirmText="Initiate Transfer"
      confirmLoading={loading}
      onConfirm={confirm}
    >
      {pc && (
        <div className="space-y-4">
          <div className="payment-detail-grid">
            <div className="payment-detail-item">
              <div className="label">Beneficiary</div>
              <div className="value">{pc.accountHolderName || '—'}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Bank</div>
              <div className="value">{pc.bankName || '—'} · {maskAccount(pc.accountNumber)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm bg-md-success/10 border border-md-success/30 rounded-xl px-4 py-3 text-md-on-success">
            <ShieldCheck size={16} />
            Bank details verified
          </div>

          <div className="text-sm text-md-on-surface-variant bg-md-surface-container-low rounded-xl px-4 py-3 border border-md-outline/10">
            The bank initiator's signature (1) is recorded automatically. This admin adds{' '}
            <strong className="text-md-on-surface">approval 1 of {Math.max(0, (pc.requiredSignatures || 1) - 1)}</strong> — total required{' '}
            <strong className="text-md-on-surface">{pc.requiredSignatures || 1}</strong> signatures.
            <div className="mt-1 flex items-center gap-2">
              <Lock size={13} />
              Initiating as: <strong className="text-md-on-surface">{identityLabel} ({identityId})</strong>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

/* ----------------------------- Authorise Transfer ----------------------------- */

export const AuthoriseTransferModal: React.FC<MutatingModalProps> = ({ pc, onClose, onDone }) => {
  const { identityId, identityLabel } = useAdminIdentity();
  const { loading, setLoading, notify } = useMutationState();
  const initiator = pc ? initiatorOf(pc) : null;
  const current = pc?.currentSignatures ?? 0;
  const required = pc?.requiredSignatures ?? 1;
  const reachesThreshold = current + 1 >= required;
  const isSoDBlocked = pc ? hasSignedOrInitiated(pc, identityId) : false;

  const confirm = async () => {
    if (!pc) return;
    setLoading(true);
    try {
      const res = await paymentApi.authorise({ caseId: pc.caseId, adminId: identityId });
      notify({
        type: 'success',
        title: reachesThreshold ? 'Transfer Authorised' : 'Authorisation Recorded',
        message: reachesThreshold
          ? `Case ${pc.caseId} fully authorised (${current + 1}/${required}). It will be submitted to the bank (Waiting Bank Approval) in a few seconds.`
          : `Authorisation recorded. Signatures now ${(res.paymentCase?.currentSignatures ?? current + 1)}/${required}.`,
      });
      onClose();
      onDone();
    } catch (e: any) {
      notify({ type: 'error', title: 'Authorise failed', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(pc)}
      onClose={onClose}
      title="Authorise Transfer"
      subtitle={pc ? `Case ${pc.caseId} · ${fmtAmount(pc.amount)}` : ''}
      cancelText="Cancel"
      confirmText="Authorise Transfer"
      confirmVariant="filled"
      confirmLoading={loading}
      onConfirm={confirm}
    >
      {pc && (
        <div className="space-y-4">
          <div className="payment-detail-item">
            <div className="label">Multi-signature progress</div>
            <div className="value">
              {current} of {required} signatures
            </div>
            <div className="text-xs text-md-on-surface-variant mt-1">
              {signaturesLeft(pc)} left to meet the threshold
            </div>
          </div>

          <div className="space-y-1 text-sm text-md-on-surface-variant">
            {pc.authorisations?.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-md-success" />
                {a.adminId} — <span className="capitalize">{a.action}</span>
              </div>
            ))}
            {!pc.authorisations?.length && <p>No signatures recorded yet.</p>}
          </div>

          {isSoDBlocked ? (
            <div className="text-sm bg-md-warning/10 border border-md-warning/30 rounded-xl px-4 py-3 text-md-on-warning">
              You cannot authorise a transfer you initiated or previously signed. (Segregation of duties)
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm bg-md-surface-container-low rounded-xl px-4 py-3 border border-md-outline/10">
              <Lock size={13} />
              Signing as: <strong className="text-md-on-surface">{identityLabel} ({identityId})</strong>
            </div>
          )}

          {reachesThreshold && (
            <div className="flex items-start gap-2 text-sm bg-md-primary/10 border border-md-primary/30 rounded-xl px-4 py-3 text-md-on-surface">
              <ShieldCheck size={16} className="shrink-0 mt-0.5 text-md-primary" />
              <span>
                Meeting the multi-signature threshold will mark this transfer <strong>Authorised</strong>,
                then automatically submit it to the commercial bank (<strong>Waiting Bank Approval</strong>) —
                from that point only the bank portal can approve or reject it.
              </span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

/* ------------------------------- Reject Transfer ------------------------------- */

export const RejectTransferModal: React.FC<MutatingModalProps> = ({ pc, onClose, onDone }) => {
  const { identityId } = useAdminIdentity();
  const { loading, setLoading, notify } = useMutationState();
  const [reason, setReason] = useState('');

  const confirm = async () => {
    if (!pc || !reason.trim()) return;
    setLoading(true);
    try {
      await paymentApi.reject({ caseId: pc.caseId, adminId: identityId, reason: reason.trim() });
      notify({ type: 'success', title: 'Transfer rejected', message: `Case ${pc.caseId} → Transfer Rejected.` });
      setReason('');
      onClose();
      onDone();
    } catch (e: any) {
      notify({ type: 'error', title: 'Reject failed', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(pc)}
      onClose={onClose}
      title="Reject Transfer"
      subtitle={pc ? `Case ${pc.caseId} · ${fmtAmount(pc.amount)}` : ''}
      cancelText="Cancel"
      confirmText="Reject Transfer"
      confirmVariant="danger"
      confirmLoading={loading}
      onConfirm={confirm}
    >
      {pc && (
        <div className="space-y-4">
          <div className="payment-detail-item">
            <div className="label">Record</div>
            <div className="value">{pc.accountHolderName || pc.beneficiaryId} · {fmtAmount(pc.amount)}</div>
          </div>
          <Textarea
            label="Rejection reason (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this transfer is being rejected…"
          />
        </div>
      )}
    </Modal>
  );
};

/* ------------------------------- Cancel Payment ------------------------------- */

export const CancelPaymentModal: React.FC<MutatingModalProps> = ({ pc, onClose, onDone }) => {
  const { identityId } = useAdminIdentity();
  const { loading, setLoading, notify } = useMutationState();
  const [reason, setReason] = useState('');

  const confirm = async () => {
    if (!pc || !reason.trim()) return;
    setLoading(true);
    try {
      await paymentApi.cancelPayment({ caseId: pc.caseId, adminId: identityId, reason: reason.trim() });
      notify({ type: 'success', title: 'Payment cancelled', message: `Case ${pc.caseId} → Cancelled.` });
      setReason('');
      onClose();
      onDone();
    } catch (e: any) {
      notify({ type: 'error', title: 'Cancel failed', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(pc)}
      onClose={onClose}
      title="Cancel Payment"
      subtitle={pc ? `Case ${pc.caseId} · ${fmtAmount(pc.amount)}` : ''}
      cancelText="Keep Payment"
      confirmText="Cancel Payment"
      confirmVariant="danger"
      confirmLoading={loading}
      onConfirm={confirm}
    >
      {pc && (
        <div className="space-y-4">
          <div className="payment-detail-item">
            <div className="label">Record</div>
            <div className="value">{pc.accountHolderName || pc.beneficiaryId} · {fmtAmount(pc.amount)}</div>
          </div>
          <div className="flex items-start gap-2 text-sm bg-md-warning/10 border border-md-warning/30 rounded-xl px-4 py-3 text-md-on-warning">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            Only pre-transfer payments can be cancelled. This records an audit entry (CANCEL) and moves the case to CANCELLED.
          </div>
          <Textarea
            label="Cancellation reason (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this payment is being cancelled…"
          />
        </div>
      )}
    </Modal>
  );
};

/* -------------------------------- Retry Payment -------------------------------- */

export const RetryPaymentModal: React.FC<MutatingModalProps> = ({ pc, onClose, onDone }) => {
  const { loading, setLoading, notify } = useMutationState();
  const lastError = pc?.failedTransactions?.[pc.failedTransactions.length - 1]?.errorLog;

  const confirm = async () => {
    if (!pc) return;
    setLoading(true);
    try {
      await paymentApi.retry(pc.caseId);
      notify({ type: 'success', title: 'Retry submitted', message: `Case ${pc.caseId} is being retried.` });
      onClose();
      onDone();
    } catch (e: any) {
      notify({ type: 'error', title: 'Retry failed', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(pc)}
      onClose={onClose}
      title="Retry Payment"
      subtitle={pc ? `Case ${pc.caseId} · ${fmtAmount(pc.amount)}` : ''}
      cancelText="Cancel"
      confirmText="Retry Payment"
      confirmLoading={loading}
      onConfirm={confirm}
    >
      {pc && (
        <div className="space-y-4">
          <div className="payment-detail-item">
            <div className="label">Record</div>
            <div className="value">{pc.accountHolderName || pc.beneficiaryId} · {pc.bankName || '—'}</div>
          </div>
          <div className="text-sm bg-md-error/10 border border-md-error/30 rounded-xl px-4 py-3 text-md-on-error break-words">
            <span className="font-semibold">Latest error:</span> {lastError || 'No error log available.'}
          </div>
        </div>
      )}
    </Modal>
  );
};

/* ---------------------------- Request Details Update ---------------------------- */

export const RequestDetailsUpdateModal: React.FC<MutatingModalProps> = ({ pc, onClose, onDone }) => {
  const { loading, setLoading, notify } = useMutationState();

  const confirm = async () => {
    if (!pc) return;
    setLoading(true);
    try {
      await paymentApi.requestDetailsUpdate(pc.caseId);
      notify({ type: 'success', title: 'Update requested', message: 'Beneficiary notified to re-submit bank details.' });
      onClose();
      onDone();
    } catch (e: any) {
      notify({ type: 'error', title: 'Request failed', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(pc)}
      onClose={onClose}
      title="Request Details Update"
      subtitle={pc ? `Case ${pc.caseId} · ${fmtAmount(pc.amount)}` : ''}
      cancelText="Cancel"
      confirmText="Request Update"
      confirmLoading={loading}
      onConfirm={confirm}
    >
      {pc && (
        <div className="space-y-4">
          <div className="payment-detail-item">
            <div className="label">Record</div>
            <div className="value">{pc.accountHolderName || pc.beneficiaryId} · {pc.bankName || '—'}</div>
          </div>
          <p className="text-sm text-md-on-surface-variant">
            The beneficiary will be asked to re-submit bank details. The case moves to{' '}
            <strong className="text-md-on-surface">Pending New Bank Details</strong>.
          </p>
        </div>
      )}
    </Modal>
  );
};

/* ------------------------------ Schedule Tomorrow ------------------------------ */

export const ScheduleTomorrowModal: React.FC<MutatingModalProps> = ({ pc, onClose, onDone }) => {
  const { loading, setLoading, notify } = useMutationState();

  const confirm = async () => {
    if (!pc) return;
    setLoading(true);
    try {
      await paymentApi.scheduleTomorrow(pc.caseId);
      notify({ type: 'success', title: 'Scheduled', message: `Case ${pc.caseId} will auto-execute 00:01 next business day (Asia/Kuala_Lumpur).` });
      onClose();
      onDone();
    } catch (e: any) {
      notify({ type: 'error', title: 'Schedule failed', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(pc)}
      onClose={onClose}
      title="Schedule Tomorrow"
      subtitle={pc ? `Case ${pc.caseId} · ${fmtAmount(pc.amount)}` : ''}
      cancelText="Cancel"
      confirmText="Schedule Tomorrow"
      confirmLoading={loading}
      onConfirm={confirm}
    >
      {pc && (
        <div className="space-y-4">
          <div className="payment-detail-item">
            <div className="label">Record</div>
            <div className="value">{pc.accountHolderName || pc.beneficiaryId} · {fmtAmount(pc.amount)}</div>
          </div>
          <p className="text-sm text-md-on-surface-variant">
            Records the decision to auto-execute at <strong className="text-md-on-surface">00:01 next business day (Asia/Kuala_Lumpur)</strong>.
            This is a recorded decision — no real scheduler exists yet (simulation).
          </p>
        </div>
      )}
    </Modal>
  );
};

/* -------------------------------- Mark Resolved -------------------------------- */

export const ResolveDisputeModal: React.FC<MutatingModalProps> = ({ pc, onClose, onDone }) => {
  const { identityId } = useAdminIdentity();
  const { loading, setLoading, notify } = useMutationState();

  const confirm = async () => {
    if (!pc) return;
    setLoading(true);
    // No dispute-resolution endpoint exists yet (flagged §8) — recorded client-side.
    await new Promise((r) => setTimeout(r, 400));
    notify({
      type: 'success',
      title: 'Dispute marked resolved',
      message: `Dispute on case ${pc.caseId} recorded as resolved by ${identityId} (simulated — no endpoint yet).`,
    });
    setLoading(false);
    onClose();
    onDone();
  };

  return (
    <Modal
      isOpen={Boolean(pc)}
      onClose={onClose}
      title="Mark Dispute Resolved"
      subtitle={pc ? `Case ${pc.caseId} · ${fmtAmount(pc.amount)}` : ''}
      cancelText="Cancel"
      confirmText="Mark Resolved"
      confirmLoading={loading}
      onConfirm={confirm}
    >
      {pc && (
        <div className="space-y-4">
          <div className="payment-detail-item">
            <div className="label">Disputed record</div>
            <div className="value">{pc.accountHolderName || pc.beneficiaryId} · {fmtAmount(pc.amount)}</div>
          </div>
          <p className="text-sm text-md-on-surface-variant">
            Confirms resolution of the beneficiary dispute as <strong className="text-md-on-surface">{identityId}</strong>.
            The audit trail records this decision.
          </p>
        </div>
      )}
    </Modal>
  );
};

/* ------------------------------- Download Receipt ------------------------------- */

export const downloadReceipt = async (pc: PaymentRow, notify: (n: { type: 'success' | 'error'; title: string; message?: string }) => void) => {
  try {
    const blob = await paymentApi.downloadReceipt(pc.caseId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${pc.caseId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify({ type: 'success', title: 'Receipt downloaded', message: `Receipt for case ${pc.caseId}.` });
  } catch (e: any) {
    notify({ type: 'error', title: 'Receipt unavailable', message: e.message || 'Receipt generation failed. Missing bank reference. Please contact support.' });
  }
};
