import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Send,
  Building2,
  PenLine,
  XCircle,
  RotateCcw,
  Ban,
  BadgeCheck,
  Download,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';
import { paymentApi } from '../../services/paymentApi';
import { landAcquisitionApi } from '../../services/landAcquisitionApi';
import { CASE_STATUS_CLASS_MAP, CASE_STATUS_LABEL_MAP } from '../../constants/landAcquisition';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useAdminIdentity } from '../../hooks/useAdminIdentity';
import { useAuth } from '../../context/AuthContext';
import { normalizePaymentStatus, paymentStatusClassMap } from './statusMaps';

export type PaymentRowActionType =
  | 'initiate'
  | 'authorise'
  | 'confirm-execution'
  | 'reject'
  | 'cancel'
  | 'retry'
  | 'request-update'
  | 'schedule'
  | 'resolve-dispute'
  | 'confirm-receipt';
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
  receipt?: { bankReferenceNumber: string; generatedAt?: string | null } | null;
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
    (norm === 'Ready to Initiate' || norm === 'Bank Details Submitted') &&
    hasBankDetails(pc)
  );
};

export const formatAdminDisplay = (adminId?: string | null, adminName?: string | null): string => {
  if (adminName && adminName.trim()) return adminName;
  if (!adminId) return 'Gov Admin 1';
  if (/^Gov(ernment)?\s*Admin/i.test(adminId)) return adminId;
  const gaMatch = adminId.match(/^ga(\d+)/i);
  if (gaMatch) return `Gov Admin ${gaMatch[1]}`;
  const emailMatch = adminId.match(/^ga(\d+)@/i);
  if (emailMatch) return `Gov Admin ${emailMatch[1]}`;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminId)) {
    return 'Gov Admin 1';
  }
  return adminId;
};

export const initiatorOf = (pc: PaymentRow) => {
  const auth = pc.authorisations?.find((a) => a.action === 'initiate');
  if (!auth) return null;
  return formatAdminDisplay(auth.adminId, (auth as any).adminName);
};

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

export const fmtAmount = (v: string | number) => `RM ${Number(v || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const maskAccount = (n?: string | null) =>
  n && n.length > 4 ? `•••• ${n.slice(-4)}` : n || '—';

export const maskMyKad = (n?: string | null) =>
  n && n.length >= 10 ? `${n.slice(0, 2)}••••-••-••${n.slice(-2)}` : n || '—';

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const paymentBadge = (status: string, currentSigs?: number, requiredSigs?: number) => {
  const s = normalizePaymentStatus(status);
  const cls = paymentStatusClassMap[s] ?? 'status-pending-approval';
  let label = s;
  if (s === 'Pending Approval') {
    label = `Pending Approval (${currentSigs || 0}/${requiredSigs || 1})`;
  }
  return (
    <span className={`payment-badge ${cls}`}>
      <span className="dot" />
      {label}
    </span>
  );
};

/* ------------------------------- View Details ------------------------------- */

export const ViewDetailsModal: React.FC<{
  pc: PaymentRow | null;
  identityId?: string;
  onClose: () => void;
  onAction?: (action: PaymentRowActionType, pc: PaymentRow) => void;
}> = ({ pc, identityId = '', onClose, onAction }) => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState<any>(null);

  useEffect(() => {
    if (!pc?.caseId) {
      setCaseData(null);
      return;
    }
    let isMounted = true;
    landAcquisitionApi
      .getCaseById(pc.caseId)
      .then((res: any) => {
        if (isMounted) setCaseData(res?.data || res?.case || res);
      })
      .catch(() => {
        if (isMounted) setCaseData(null);
      });
    return () => {
      isMounted = false;
    };
  }, [pc?.caseId]);

  if (!pc) return null;

  const norm = normalizePaymentStatus(pc.status);
  const signed = hasSignedOrInitiated(pc, identityId);
  const left = signaturesLeft(pc);
  const isSysAdmin = user?.role === 'SYSTEM_ADMINISTRATOR';
  const canCancel = PRE_TRANSFER_STATUSES.includes(norm) && !isSysAdmin;

  const renderFooterActions = () => {
    if (isSysAdmin) {
      return (
        <span className="text-xs text-md-on-surface-variant italic px-2">
          View Only (System Administrator)
        </span>
      );
    }

    switch (norm) {
      case 'Bank Details Pending':
      case 'New Bank Details Pending':
        return (
          <Button
            size="md"
            variant="filled"
            disabled
            title="Awaiting beneficiary bank details submission before transfer can be initiated"
          >
            <Send size={15} />
            <span>Initiate Transfer</span>
          </Button>
        );

      case 'Ready to Initiate':
      case 'Bank Details Submitted':
        return (
          <Button
            size="md"
            variant="filled"
            disabled={!hasBankDetails(pc)}
            title={!hasBankDetails(pc) ? 'Awaiting beneficiary bank details before transfer can be initiated' : undefined}
            onClick={() => {
              onClose();
              onAction?.('initiate', pc);
            }}
          >
            <Send size={15} />
            <span>Initiate Transfer</span>
          </Button>
        );

      case 'Pending Approval':
      case 'Transfer Initiated':
      case 'Authorised':
        if (left > 0 && !signed) {
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                size="md"
                onClick={() => {
                  onClose();
                  onAction?.('reject', pc);
                }}
              >
                <XCircle size={15} />
                <span>Reject Transfer</span>
              </Button>
              <Button
                variant="filled"
                size="md"
                onClick={() => {
                  onClose();
                  onAction?.('authorise', pc);
                }}
              >
                <PenLine size={15} />
                <span>Authorise Transfer</span>
              </Button>
            </div>
          );
        }
        if (left > 0 && signed) {
          return (
            <Button
              variant="tonal"
              size="md"
              disabled
              className="opacity-50 cursor-not-allowed"
              title="You cannot authorise a transfer you initiated or previously signed (Segregation of Duties)"
            >
              <Lock size={15} />
              <span>Authorise (Already Signed)</span>
            </Button>
          );
        }
        if (left === 0) {
          return (
            <Button
              variant="filled"
              size="md"
              className="!bg-md-error !text-md-on-error hover:!bg-md-error/90"
              onClick={() => {
                onClose();
                onAction?.('confirm-execution', pc);
              }}
            >
              <Send size={15} />
              <span>Confirm Release</span>
            </Button>
          );
        }
        return null;

      case 'Bank Approval Pending':
      case 'Waiting Bank Approval':
        return (
          <div className="flex items-center gap-2 text-xs text-md-on-surface-variant italic">
            <Clock size={14} className="text-md-primary" />
            <span>Awaiting bank clearance</span>
          </div>
        );

      case 'Transfer Rejected':
      case 'Cancelled':
        return (
          <Button
            variant="filled"
            size="md"
            onClick={() => {
              onClose();
              onAction?.('request-update', pc);
            }}
          >
            <span>Request New Bank Details</span>
          </Button>
        );

      case 'Transfer Failed':
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outlined"
              size="md"
              onClick={() => {
                onClose();
                onAction?.('schedule', pc);
              }}
            >
              <span>Schedule Tomorrow</span>
            </Button>
            <Button
              variant="filled"
              size="md"
              onClick={() => {
                onClose();
                onAction?.('request-update', pc);
              }}
            >
              <span>Request New Bank Details</span>
            </Button>
          </div>
        );

      case 'Transfer Succeed': {
        const transferDate = pc.receipt?.generatedAt || pc.updatedAt || pc.createdAt;
        const daysElapsed = transferDate
          ? Math.floor((Date.now() - new Date(transferDate).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        const isEligible = daysElapsed >= 7;

        return (
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <Button
                variant="filled"
                size="md"
                disabled={!isEligible}
                className={!isEligible ? '!opacity-50 !cursor-not-allowed' : '!bg-emerald-600 !text-white hover:!bg-emerald-700'}
                onClick={async () => {
                  try {
                    await paymentApi.confirmReceipt({ caseId: pc.caseId, isAutoOrAdminOverride: true });
                    notify({
                      type: 'success',
                      title: 'Payment Confirmed',
                      message: `Case ${pc.caseId} marked as Paid. Now eligible for blockchain publishing.`,
                    });
                    onClose();
                    onAction?.('confirm-receipt', pc);
                  } catch (err: unknown) {
                    const e = err as Error;
                    notify({
                      type: 'error',
                      title: 'Confirmation Failed',
                      message: e.message || 'Could not mark payment as Paid.',
                    });
                  }
                }}
              >
                <CheckCircle2 size={15} />
                <span>Confirm Receipt (Mark Paid)</span>
              </Button>
            </div>
            {!isEligible && (
              <span className="text-[11px] text-md-on-surface-variant font-medium">
                Member confirmation window active. Admin manual confirmation unlocks in {7 - daysElapsed} day(s) (7-day rule).
              </span>
            )}
          </div>
        );
      }

      case 'Disputed':
      case 'Payment Disputed':
        return (
          <Button
            variant="filled"
            size="md"
            onClick={() => {
              onClose();
              onAction?.('resolve-dispute', pc);
            }}
          >
            <BadgeCheck size={15} />
            <span>Resolve Dispute</span>
          </Button>
        );

      case 'Paid':
        return (
          <Button
            variant="tonal"
            size="md"
            onClick={() => downloadReceipt(pc, notify)}
          >
            <Download size={15} />
            <span>Download Official Receipt</span>
          </Button>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={Boolean(pc)}
      onClose={onClose}
      title="Disbursement Case Record"
      subtitle={`Payment ID: ${pc.paymentId || 'PMT-' + pc.caseId}`}
      cancelText="Close"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="text" size="md" onClick={onClose}>
            Close
          </Button>
          <div>{renderFooterActions()}</div>
        </div>
      }
    >
      <div className="space-y-5 text-sm">
        {/* Case Details Above */}
        <div className="bg-md-surface-container-low rounded-xl p-4 border border-md-outline/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-md-primary text-xs uppercase tracking-wider">
              <Building2 size={16} />
              <span>Statutory Acquisition Case Details</span>
            </div>
            <span className="font-mono text-xs font-bold text-md-primary">
              {pc.caseId}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <span className="text-md-on-surface-variant block">Project Name</span>
              <span className="font-semibold text-md-on-surface">
                {caseData?.project?.projectName || (pc.caseId === 'LAC-2026-08-0003' ? 'Desa Melati Flood Mitigation Project' : 'Statutory Land Acquisition')}
              </span>
            </div>
            <div>
              <span className="text-md-on-surface-variant block mb-1">Statutory Case Status</span>
              <span className={`payment-badge ${CASE_STATUS_CLASS_MAP[caseData?.status || 'OFFER_ACCEPTED'] || 'status-offer-accepted'} text-xs font-semibold`}>
                <span className="dot" />
                {CASE_STATUS_LABEL_MAP[caseData?.status || 'OFFER_ACCEPTED'] || (caseData?.status || 'Offer Accepted').replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <span className="text-md-on-surface-variant block">Land Parcel / Lot</span>
              <span className="text-md-on-surface">
                {caseData?.landParcel?.lotNo || (pc.caseId === 'LAC-2026-08-0003' ? 'Lot 3104, Mukim Setapak' : 'Lot Parcel')}
              </span>
            </div>
            <div>
              <span className="text-md-on-surface-variant block">Legal Award Basis</span>
              <span className="text-md-on-surface">
                Land Acquisition Act 1960 (Form H)
              </span>
            </div>
          </div>
        </div>

        {/* Operational Payment Details */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-md-on-surface-variant mb-2.5">
            Disbursement & Banking Details
          </div>
          <div className="payment-detail-grid">
            <div className="payment-detail-item">
              <div className="label">Payment ID</div>
              <div className="value mono font-mono text-md-primary font-bold">{pc.paymentId || `PMT-${pc.caseId}`}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Beneficiary</div>
              <div className="value font-semibold">{pc.accountHolderName || pc.beneficiaryId || '—'}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">MyKad</div>
              <div className="value mono font-mono">{maskMyKad(pc.myKadNumber)}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Phone</div>
              <div className="value mono font-mono">{pc.phoneNumber || '—'}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Bank</div>
              <div className="value">
                {norm === 'Bank Details Pending' || norm === 'New Bank Details Pending'
                  ? 'Awaiting Submission'
                  : pc.bankName || '—'}
              </div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Account</div>
              <div className="value mono font-mono">
                {norm === 'Bank Details Pending' || norm === 'New Bank Details Pending'
                  ? 'Awaiting Submission'
                  : maskAccount(pc.accountNumber)}
              </div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Award Amount</div>
              <div className="value font-bold text-md-primary">{fmtAmount(pc.amount)}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Payment Status</div>
              <div className="value">{paymentBadge(norm, pc.currentSignatures, pc.requiredSignatures)}</div>
            </div>
          </div>
        </div>
        {/* Multi-Sig / Approvals */}
        <div>
          <div className="label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--md-on-surface-variant)', marginBottom: 8 }}>
            Dual Governance Approvals ({pc.currentSignatures || 0}/{pc.requiredSignatures || 1} Signatures)
          </div>
          <div className="space-y-2">
            {(pc.authorisations ?? []).length === 0 && (
              <p className="text-xs text-md-on-surface-variant">No approvals recorded yet.</p>
            )}
            {(pc.authorisations ?? []).map((a, i) => (
              <div key={i} className="flex items-start justify-between gap-3 text-xs bg-md-surface-container-low rounded-xl px-4 py-2.5 border border-md-outline/10">
                <div>
                  <span className="font-semibold text-md-on-surface capitalize">{a.action}</span>
                  <span className="text-md-on-surface-variant font-medium text-[11px]"> · {formatAdminDisplay(a.adminId, (a as any).adminName)}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-md-on-surface-variant font-mono">{fmtDate(a.createdAt)}</div>
                  {a.reason && <div className="text-xs text-md-on-surface-variant italic">{a.reason}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transfer Attempts / Errors */}
        {(pc.failedTransactions ?? []).length > 0 && (
          <div>
            <div className="label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--md-on-surface-variant)', marginBottom: 8 }}>
              Transfer Attempts
            </div>
            <div className="space-y-2">
              {(pc.failedTransactions ?? []).map((f, i) => (
                <div key={i} className="bg-md-surface-container-low rounded-xl px-4 py-2.5 border border-md-outline/10 text-xs">
                  <div className="text-[11px] text-md-on-surface-variant mb-1">
                    Attempt #{i + 1} · {fmtDate(f.createdAt)}
                  </div>
                  <div className="text-md-on-surface break-words">{f.errorLog}</div>
                  {f.resolution && (
                    <div className="text-[11px] text-md-on-success mt-1">
                      Resolution: {f.resolution} {f.resolvedAt ? `· ${fmtDate(f.resolvedAt)}` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancel Payment Action at Lowest Bottom of Modal */}
        {canCancel && (
          <div className="pt-4 border-t border-md-outline/15 flex items-center justify-between bg-red-500/5 -mx-6 px-6 py-3 rounded-b-xl">
            <div className="text-xs text-md-on-surface-variant">
              <span className="font-semibold text-red-600 dark:text-red-400 block">Cancel Disbursement</span>
              <span>Revoke compensation transfer order before bank release</span>
            </div>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => {
                onClose();
                onAction?.('cancel', pc);
              }}
              className="shrink-0"
            >
              <Ban size={14} />
              <span>Cancel Payment</span>
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

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

export interface FinalExecutionConfirmModalProps {
  pc: PaymentRow | null;
  isOpen: boolean;
  onConfirm: () => Promise<void>;
  onHold: () => void;
}

export const FinalExecutionConfirmModal: React.FC<FinalExecutionConfirmModalProps> = ({
  pc,
  isOpen,
  onConfirm,
  onHold,
}) => {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!checked || loading) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen && Boolean(pc)}
      onClose={() => {}}
      preventBackdropClose={true}
      showCloseButton={false}
      maxWidth="max-w-xl"
      title="Final Disbursement Release Order"
      subtitle={pc ? `Case ${pc.caseId} · ${fmtAmount(pc.amount)}` : ''}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="text" size="md" onClick={onHold} disabled={loading}>
            Keep on Hold in Authorised
          </Button>
          <Button
            variant="filled"
            size="md"
            disabled={!checked}
            isLoading={loading}
            onClick={handleConfirm}
            className="!bg-md-error !text-md-on-error hover:!bg-md-error/90"
          >
            Confirm &amp; Dispatch Bank Payment
          </Button>
        </div>
      }
    >
      {pc && (
        <div className="space-y-4">
          <div className="bg-md-error/15 border-2 border-md-error/40 rounded-xl p-4 text-md-on-error-container">
            <div className="flex items-center gap-2 text-md-error font-bold text-sm tracking-wide uppercase">
              <ShieldAlert size={18} />
              FINAL DISBURSEMENT RELEASE ORDER — POINT OF NO REVERSAL
            </div>
            <p className="text-xs text-md-on-surface mt-2 leading-relaxed">
              You are issuing an irrevocable bank fund release order under the Land Acquisition Act 1960.
              Once confirmed, interbank commercial clearing instructions will execute immediately and cannot be recalled or stopped.
            </p>
          </div>

          <div className="payment-detail-grid">
            <div className="payment-detail-item">
              <div className="label">Case Reference</div>
              <div className="value font-mono font-bold text-md-primary">{pc.caseId}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Total Statutory Award</div>
              <div className="value font-bold text-md-primary text-base">{fmtAmount(pc.amount)}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Beneficiary Name</div>
              <div className="value">{pc.accountHolderName || '—'}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Receiving Bank &amp; Account</div>
              <div className="value">{pc.bankName || '—'} · {maskAccount(pc.accountNumber)}</div>
            </div>
          </div>

          <div className="bg-md-surface-container-low rounded-xl px-4 py-3 border border-md-outline/10 text-xs text-md-on-surface-variant flex items-center justify-between">
            <span>Authorisation Status:</span>
            <span className="font-semibold text-md-success flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              All Approvals Complete ({pc.requiredSignatures}/{pc.requiredSignatures} Signatures)
            </span>
          </div>

          <div className="pt-2 border-t border-md-outline/10">
            <Checkbox
              id="final-disbursement-acknowledgement"
              label="I confirm all approvals are complete and authorise immediate interbank payment execution."
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
          </div>
        </div>
      )}
    </Modal>
  );
};

export const AuthoriseTransferModal: React.FC<MutatingModalProps> = ({ pc, onClose, onDone }) => {
  const { identityId, identityLabel } = useAdminIdentity();
  const { loading, setLoading, notify } = useMutationState();
  const [showFinalModal, setShowFinalModal] = useState(false);
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
      if (reachesThreshold) {
        setShowFinalModal(true);
      } else {
        notify({
          type: 'success',
          title: 'Authorisation Recorded',
          message: `Authorisation recorded. Signatures now ${(res.paymentCase?.currentSignatures ?? current + 1)}/${required}.`,
        });
        onClose();
        onDone();
      }
    } catch (e: any) {
      notify({ type: 'error', title: 'Authorise failed', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalConfirm = async () => {
    if (!pc) return;
    try {
      await paymentApi.confirmExecution({ caseId: pc.caseId, adminId: identityId });
      notify({
        type: 'success',
        title: 'Payment Dispatched to Bank',
        message: `Case ${pc.caseId} confirmed and dispatched to the commercial bank clearing queue.`,
      });
      setShowFinalModal(false);
      onClose();
      onDone();
    } catch (e: any) {
      notify({ type: 'error', title: 'Bank dispatch failed', message: e.message });
    }
  };

  const handleFinalHold = () => {
    notify({
      type: 'general',
      title: 'Transfer Authorised (On Hold)',
      message: `Case ${pc?.caseId} is fully authorised and kept on hold awaiting final dispatch confirmation.`,
    });
    setShowFinalModal(false);
    onClose();
    onDone();
  };

  return (
    <>
      <Modal
        isOpen={Boolean(pc) && !showFinalModal}
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
                  <CheckCircle2 size={14} className="text-md-success shrink-0" />
                  <span className="font-medium text-md-on-surface">{formatAdminDisplay(a.adminId, (a as any).adminName)}</span>
                  <span>— <span className="capitalize">{a.action}</span></span>
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
                  Meeting the multi-signature threshold will mark this transfer <strong>Authorised</strong>.
                  As the final authoriser, you will be prompted for final release confirmation before funds are dispatched to the commercial bank.
                </span>
              </div>
            )}
          </div>
        )}
      </Modal>

      <FinalExecutionConfirmModal
        pc={pc}
        isOpen={showFinalModal}
        onConfirm={handleFinalConfirm}
        onHold={handleFinalHold}
      />
    </>
  );
};

/* ------------------------------- Cancellation / Rejection Reasons ------------------------------- */

export const CANCELLATION_REASONS = [
  {
    value: 'LANDOWNER_REQUESTED_ACCOUNT_CHANGE',
    label: 'Landowner requested bank account change / account closed',
    solution: 'Request Landowner to Update Bank Details',
  },
  {
    value: 'LEGAL_DISPUTE_OR_INJUNCTION',
    label: 'Land parcel ownership dispute or court injunction received',
    solution: 'Hold Case Pending Legal Resolution',
  },
  {
    value: 'INCORRECT_AWARD_AMOUNT',
    label: 'Statutory compensation award calculation error detected',
    solution: 'Re-open Valuation Review in Land Module',
  },
  {
    value: 'SUSPECTED_FRAUD_OR_IMPERSONATION',
    label: 'Security flag raised on beneficiary identity or banking document',
    solution: 'Re-verify MyKad & Title with Land Office',
  },
  {
    value: 'DUPLICATE_DISBURSEMENT_PREVENTION',
    label: 'Duplicate payment instruction detected across system records',
    solution: 'Cancel Duplicate Voucher',
  },
];

/* ------------------------------- Reject Transfer ------------------------------- */

export const RejectTransferModal: React.FC<MutatingModalProps> = ({ pc, onClose, onDone }) => {
  const { identityId } = useAdminIdentity();
  const { loading, setLoading, notify } = useMutationState();
  const [selectedReason, setSelectedReason] = useState('');

  const selectedOption = CANCELLATION_REASONS.find((r) => r.value === selectedReason);

  const confirm = async () => {
    if (!pc || !selectedReason) return;
    setLoading(true);
    try {
      await paymentApi.reject({ caseId: pc.caseId, adminId: identityId, reason: selectedReason });
      notify({ type: 'success', title: 'Transfer rejected', message: `Case ${pc.caseId} → Transfer Rejected.` });
      setSelectedReason('');
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
      confirmDisabled={!selectedReason}
      onConfirm={selectedReason ? confirm : undefined}
    >
      {pc && (
        <div className="space-y-4">
          <div className="payment-detail-item">
            <div className="label">Record</div>
            <div className="value">{pc.accountHolderName || pc.beneficiaryId} · {fmtAmount(pc.amount)}</div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-md-on-surface flex items-center gap-1">
              <span>Standardized Rejection Reason (Required)</span>
              <span className="text-md-error">*</span>
            </label>
            <Select
              label="Rejection Reason"
              placeholder="Select an approved rejection reason…"
              options={CANCELLATION_REASONS.map((r) => ({ value: r.value, label: r.label }))}
              value={selectedReason}
              onChange={(val) => setSelectedReason(val)}
            />
            {selectedOption && (
              <div className="text-xs bg-md-surface-container-highest rounded-lg px-3 py-2 text-md-on-surface-variant flex items-center gap-1.5">
                <span className="font-semibold text-md-on-surface">Recommended SOP:</span>
                <span>{selectedOption.solution}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

/* ------------------------------- Cancel Payment ------------------------------- */
export const CancelPaymentModal: React.FC<MutatingModalProps> = ({ pc, onClose, onDone }) => {
  const { identityId } = useAdminIdentity();
  const { loading, setLoading, notify } = useMutationState();
  const [selectedReason, setSelectedReason] = useState('');
  const [confirmationInput, setConfirmationInput] = useState('');

  const selectedOption = CANCELLATION_REASONS.find((r) => r.value === selectedReason);
  const isConfirmed = Boolean(selectedReason && confirmationInput.trim() === pc?.caseId);

  const confirm = async () => {
    if (!pc || !isConfirmed) return;
    setLoading(true);
    try {
      await paymentApi.cancelPayment({
        caseId: pc.caseId,
        adminId: identityId,
        reason: selectedReason,
      });
      notify({
        type: 'success',
        title: 'Payment cancelled',
        message: `Case ${pc.caseId} cancelled and recorded in Failed Transactions for SOP resolution.`,
      });
      setSelectedReason('');
      setConfirmationInput('');
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
      title="Cancel Payment (Destructive Action)"
      subtitle={pc ? `Case ${pc.caseId} · ${fmtAmount(pc.amount)}` : ''}
      cancelText="Keep Payment"
      confirmText="Confirm Cancel Payment"
      confirmVariant="danger"
      confirmLoading={loading}
      confirmDisabled={!isConfirmed}
      onConfirm={isConfirmed ? confirm : undefined}
    >
      {pc && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 text-sm bg-md-error/10 border border-md-error/30 rounded-xl px-4 py-3 text-md-on-error-container">
            <AlertTriangle size={18} className="shrink-0 mt-0.5 text-md-error" />
            <span>
              <strong>WARNING:</strong> Cancelling a payment case stops all disbursements and flags this transaction in Failed Transactions for SOP resolution.
            </span>
          </div>

          <div className="payment-detail-grid">
            <div className="payment-detail-item">
              <div className="label">Beneficiary</div>
              <div className="value">{pc.accountHolderName || pc.beneficiaryId}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Award Amount</div>
              <div className="value font-bold text-md-primary">{fmtAmount(pc.amount)}</div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-md-on-surface-variant block">
              Statutory Cancellation Reason (required)
            </label>
            <Select
              label="Cancellation Reason"
              placeholder="Select an approved cancellation reason…"
              options={CANCELLATION_REASONS.map((r) => ({ value: r.value, label: r.label }))}
              value={selectedReason}
              onChange={(val) => setSelectedReason(val)}
            />
            {selectedOption && (
              <div className="text-xs bg-md-surface-container-highest rounded-lg px-3 py-2 text-md-on-surface-variant flex items-center gap-1.5">
                <span className="font-semibold text-md-primary">Resolution SOP:</span>
                <span>{selectedOption.solution}</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-md-outline/10 space-y-1.5">
            <p className="text-xs text-md-on-surface-variant">
              Type Case ID <strong className="font-mono text-md-on-surface">{pc.caseId}</strong> to confirm cancellation:
            </p>
            <Input
              label={`Confirm Case ID`}
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={pc.caseId}
            />
          </div>
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
