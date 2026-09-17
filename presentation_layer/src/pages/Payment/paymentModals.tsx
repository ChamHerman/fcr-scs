import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
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
  FileText,
  ExternalLink,
  Eye,
  UploadCloud,
  ArrowUpRight,
  Archive,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';
import { paymentApi } from '../../services/paymentApi';
import { landAcquisitionApi } from '../../services/landAcquisitionApi';
import { blockchainApi } from '../../services/blockchainApi';
import { compensationApi } from '../../services/compensationApi';
import { formatGraceCountdown } from '../SmartContract/PublishLedger';
import { BASE_URL } from '../../services/api';
import { CASE_STATUS_CLASS_MAP, CASE_STATUS_LABEL_MAP } from '../../constants/landAcquisition';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useAdminIdentity } from '../../hooks/useAdminIdentity';
import { useAuth } from '../../context/AuthContext';
import { formatActionLabel, formatReasonLabel, isRejectionAction, normalizePaymentStatus, paymentStatusClassMap, isCategory1BankFailure } from './statusMaps';
import { OwnerStack } from '../../components/payment/OwnerStack';
import { formatDateTime } from '../../utils/dateFormat';

export type PaymentRowActionType =
  | 'initiate'
  | 'authorise'
  | 'confirm-execution'
  | 'reject'
  | 'resolve-rejection'
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
  /** Active multi-sig cycle (FR-020): increments when bank details are replaced. */
  cycle?: number;
  createdAt: string;
  updatedAt: string;
  authorisations?: Array<{ adminId: string; action: string; reason?: string | null; createdAt: string; cycle?: number }>;
  /**
   * The frozen canonical receipts (FR-019), one per paying owner. Present from
   * TRANSFER_SUCCEED onward and kept regardless of later status changes, so the
   * record modal can always show that a receipt was issued for this case.
   */
  receipt?: { bankReferenceNumber?: string | null; generatedAt?: string | null; documentHash?: string | null } | null;
  receipts?: Array<{
    id?: string;
    paymentBeneficiaryId?: string | null;
    bankReferenceNumber?: string | null;
    generatedAt?: string | null;
    documentHash?: string | null;
    beneficiary?: { accountHolderName?: string | null; sharePercent?: number | string | null } | null;
  }>;
  /**
   * Co-owners of the same parcel. One payment record is split across N owners by
   * percentage share, each with their own payout account and submission state.
   */
  beneficiaries?: Array<{
    id?: string;
    ownerId?: string;
    beneficiaryIndex?: number;
    sharePercent?: number | string | null;
    amount?: number | string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    accountHolderName?: string | null;
    myKadNumber?: string | null;
    submittedAt?: string | null;
  }> | null;
  /** Archived receipts from voided dispute cycles (FR-014), newest first. */
  receiptArchives?: Array<{
    id: string;
    bankReferenceNumber: string;
    documentHash?: string | null;
    generatedAt: string;
    archivedAt: string;
    archiveReason?: string | null;
  }>;
  failedTransactions?: Array<{ errorLog: string; resolution?: string | null; resolvedAt?: string | null; createdAt: string }>;
  disputeDocumentPath?: string | null;
  disputeDocumentName?: string | null;
  disputeUploadedAt?: string | null;
  /** Whether Milestone 1 (Statutory Award) is notarized on-chain (FR-019). */
  isM1Published?: boolean;
  /** Statutory case status from Land Acquisition (e.g. OFFER_ACCEPTED, OFFER_ISSUED). */
  caseStatus?: string;
  /** Calculated target execution datetime for SCHEDULED transfers. */
  scheduledFor?: string | null;
}

/**
 * Cancel is a terminal, high-accountability action. It is offered ONLY on cases
 * the bank or governance has already bounced (Transfer Rejected / Transfer
 * Failed). Every earlier stage has its own non-destructive SOP (Request New
 * Bank Details, Mark as Resolved), so the cancel entry point is hidden there to
 * prevent accidental cancellation.
 */
export const CANCELLABLE_STATUSES = ['Transfer Rejected', 'Transfer Failed'];

export const hasBankDetails = (pc: PaymentRow) =>
  Boolean(pc.bankName && pc.accountNumber && pc.accountHolderName);

export const formatLocalPhoneDisplay = (raw?: string | null): string => {
  if (!raw) return '—';
  let cleaned = String(raw).trim().replace(/[\s-]/g, '');
  if (cleaned.startsWith('+60')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('+6')) cleaned = cleaned.slice(2);
  else if (cleaned.startsWith('60')) cleaned = cleaned.slice(2);
  if (!cleaned.startsWith('0') && cleaned.length > 0) cleaned = `0${cleaned}`;
  cleaned = cleaned.replace(/\D/g, '');
  return cleaned || '—';
};

export const isReadyToInitiate = (pc: PaymentRow) => {
  const norm = normalizePaymentStatus(pc.status);
  return (
    (norm === 'Ready to Initiate' || norm === 'Bank Details Submitted' || norm === 'Offer Accepted') &&
    hasBankDetails(pc) &&
    Boolean(pc.isM1Published)
  );
};

export const formatAdminDisplay = (adminId?: string | null, adminName?: string | null): string => {
  if (adminName && adminName.trim()) return adminName;
  if (!adminId) return 'Unknown Admin';
  if (/^Gov(ernment)?\s*Admin/i.test(adminId)) return adminId;
  const gaMatch = adminId.match(/^ga(\d+)/i);
  if (gaMatch) return `Gov Admin ${gaMatch[1]}`;
  const emailMatch = adminId.match(/^ga(\d+)@/i);
  if (emailMatch) return `Gov Admin ${emailMatch[1]}`;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminId)) {
    return 'Unknown Admin';
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

/**
 * Identity match across the shapes an admin id takes: a raw UUID
 * (paymentAuthorisation.adminId), "ga1"-style short ids, emails, or the
 * enriched display name ("Gov Admin 1"). Never compare display names to raw
 * ids directly — that is what silently disabled the Segregation of Duties
 * frontend guard.
 */
const sameAdminIdentity = (a?: string | null, b?: string | null): boolean => {
  const x = String(a || '').trim().toLowerCase();
  const y = String(b || '').trim().toLowerCase();
  if (!x || !y) return false;
  if (x === y) return true;
  const gaOf = (v: string) => {
    const m = v.match(/^(?:ga(\d+)|ga(\d+)@|gov(?:ernment)?\s*admin\s*(\d+))/);
    return m ? Number(m[1] || m[2] || m[3]) : null;
  };
  const gx = gaOf(x);
  const gy = gaOf(y);
  return gx !== null && gy !== null && gx === gy;
};

/**
 * Only an initiator or a GA who already APPROVED is barred from authorising —
 * a GA who rejected (or resolved) the case may approve after the rejection is
 * resolved. The backend enforces the same narrowed rule, so the frontend
 * disable-state must match exactly. Both are scoped to the ACTIVE cycle
 * (FR-020): Cycle-1 signatures do not bar anyone from the Cycle-2 round.
 */
export const hasSignedOrInitiated = (pc: PaymentRow, adminId: string) => {
  const activeCycle = pc.cycle ?? 1;
  return (pc.authorisations ?? []).some(
    (a) =>
      (a.cycle ?? 1) === activeCycle &&
      (a.action === 'initiate' || a.action === 'authorise') &&
      (sameAdminIdentity(a.adminId, adminId) || sameAdminIdentity((a as any).adminName, adminId))
  );
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

export const fmtDate = (d?: string | null) => formatDateTime(d);

/** GA audit entries must stack chronologically. The API already returns them in
 *  created order; this sort keeps the log correct for rows cached from an older
 *  response, where the relation came back in arbitrary physical order. */
export const byCreatedAtAsc = <T extends { createdAt: string }>(rows: T[]): T[] =>
  [...rows].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

/** Machine code prefixes (e.g. "RECIPIENT_ACCOUNT_INVALID_OR_NOT_FOUND: ...")
 *  must never surface in the UI — keep the human sentence only. */
export const stripRawLogPrefix = (log: string) =>
  (log || '').replace(/^\s*[A-Z0-9_]{6,}\s*:\s*/, '').trim() || log;

const RESOLUTION_LABELS: Record<string, string> = {
  retry: 'Retried by Government Admin',
  request_details: 'New bank details requested',
  request_new_bank_details: 'New bank details requested',
  schedule_tomorrow: 'Scheduled for next business day',
  schedule_next_working_day: 'Scheduled for next working day',
  auto_executed_scheduled: 'Auto-dispatched on schedule',
  mark_resolved: 'Marked as resolved',
  reinitiate_payment: 'Payment reinitiated',
  dispute_marked_resolved: 'Dispute marked as resolved',
  dispute_reinitiate_payment: 'Payment reinitiated',
  dispute_request_new_bank_details: 'New bank details requested',
};

export const formatResolutionLabel = (r?: string | null): string => {
  if (!r) return '';
  const trimmed = r.trim();
  const lower = trimmed.toLowerCase();

  // Handle schedule_next_working_day:<ISO_DATE> or schedule_tomorrow:<ISO_DATE>
  if (lower.startsWith('schedule_next_working_day:') || lower.startsWith('schedule_tomorrow:')) {
    const rawDate = trimmed.split(':').slice(1).join(':').trim();
    const formattedDate = rawDate ? fmtDate(rawDate) : '';
    return formattedDate
      ? `Scheduled for next working day (${formattedDate})`
      : 'Scheduled for next working day';
  }

  if (RESOLUTION_LABELS[lower]) {
    return RESOLUTION_LABELS[lower];
  }

  // Handle any other generic key:value resolution format
  if (trimmed.includes(':')) {
    const [action, ...rest] = trimmed.split(':');
    const actionLabel = RESOLUTION_LABELS[action.toLowerCase()] || formatReasonLabel(action);
    const detail = rest.join(':').trim();
    const isIsoDate = /^\d{4}-\d{2}-\d{2}T/.test(detail);
    const formattedDetail = isIsoDate ? fmtDate(detail) : detail;
    return `${actionLabel} (${formattedDetail})`;
  }

  const reasonMapped = formatReasonLabel(trimmed);
  if (reasonMapped && reasonMapped !== trimmed) {
    return reasonMapped;
  }

  // Clean fallback for any snake_case identifier
  return trimmed
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export interface BankBeneficiaryEvent {
  kind: 'success' | 'failed' | 'dispute';
  date: string;
  title: string;
  detail: string;
  resolved?: string | null;
}

/**
 * "From Bank / Beneficiary" timeline: every bank-side and beneficiary-side
 * event on the payment record — successful bank clearances, bank returns
 * (failed attempts), and member disputes. GA governance actions (initiate /
 * authorise / execute / reject / cancel / resolve) live in the separate
 * "From Government Admin" audit list and are excluded here.
 */
export const bankBeneficiaryEvents = (pc: PaymentRow): BankBeneficiaryEvent[] => {
  const events: BankBeneficiaryEvent[] = [];
  // A receipt is a historical fact: once one was generated for this case it stays
  // visible no matter what status the case later moves to (failed, disputed,
  // cancelled, re-scheduled). Gate on the receipt existing, not on its timestamp
  // being populated, so a row without `generatedAt` still surfaces.
  if (pc.receipt) {
    events.push({
      kind: 'success',
      date: pc.receipt.generatedAt || pc.updatedAt || pc.createdAt,
      title: 'Transfer Successful',
      detail: pc.receipt.bankReferenceNumber
        ? `Bank cleared the fund release · Reference ${pc.receipt.bankReferenceNumber}`
        : 'Bank cleared the fund release',
    });
  }
  for (const f of pc.failedTransactions ?? []) {
    const log = f.errorLog || '';
    if (/^(CANCELLED|REJECTED)\s*:/i.test(log)) continue; // GA governance actions
    if (/^DISPUTE\s*:/i.test(log)) {
      events.push({
        kind: 'dispute',
        date: f.createdAt,
        title: 'Dispute Raised by Beneficiary',
        detail: log.replace(/^DISPUTE\s*:\s*/, ''),
        resolved: f.resolution,
      });
      continue;
    }
    events.push({
      kind: 'failed',
      date: f.createdAt,
      title: 'Bank Returned the Transfer',
      detail: stripRawLogPrefix(log),
      resolved: f.resolution,
    });
  }
  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

/** Case created / updated timestamps — shown in every payment-related modal. */
export const CaseTimestamps: React.FC<{ pc: PaymentRow; caseData?: any }> = ({ pc, caseData: propCaseData }) => {
  const [fetchedCase, setFetchedCase] = useState<any>(null);

  useEffect(() => {
    if (propCaseData || !pc?.caseId) return;
    let isMounted = true;
    landAcquisitionApi
      .getCaseById(pc.caseId)
      .then((res: any) => {
        if (isMounted) setFetchedCase(res?.data || res?.case || res);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [pc?.caseId, propCaseData]);

  const caseObj = propCaseData || fetchedCase;
  const caseCreated = caseObj?.createdAt || caseObj?.registrationDate || pc.createdAt;
  const caseUpdated = caseObj?.updatedAt || pc.updatedAt;
  const acceptedAt =
    caseObj?.offerLetters?.find((o: any) => o.status === 'ACCEPTED' || o.acceptedAt)?.acceptedAt ||
    caseObj?.offerLetters?.[0]?.acceptedAt;

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-md-on-surface-variant">
      <span>
        <span className="font-semibold">Case Created:</span> {fmtDate(caseCreated)}
      </span>
      {acceptedAt && (
        <span>
          <span className="font-semibold">Offer Accepted:</span> {fmtDate(acceptedAt)}
        </span>
      )}
      <span>
        <span className="font-semibold">Last Updated:</span> {fmtDate(caseUpdated)}
      </span>
    </div>
  );
};

export const formatScheduledSubtitle = (scheduledFor?: string | Date | null): string => {
  let targetDate: Date;
  if (scheduledFor) {
    targetDate = new Date(scheduledFor);
  } else {
    const mytOffsetMs = 8 * 60 * 60 * 1000;
    const myt = new Date(Date.now() + mytOffsetMs);
    myt.setUTCDate(myt.getUTCDate() + 1);
    if (myt.getUTCDay() === 6) myt.setUTCDate(myt.getUTCDate() + 2);
    else if (myt.getUTCDay() === 0) myt.setUTCDate(myt.getUTCDate() + 1);
    myt.setUTCHours(9, 0, 0, 0);
    targetDate = new Date(myt.getTime() - mytOffsetMs);
  }

  const formatted = targetDate.toLocaleString('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return `Next Working Day · ${formatted}`;
};

export const paymentBadge = (
  status: string,
  currentSigs?: number,
  requiredSigs?: number,
  scheduledFor?: string | Date | null,
  // The schedule date line is opt-in: detail views show it, admin tables show
  // the status only.
  showScheduledFor = false
) => {
  const s = normalizePaymentStatus(status);
  const cls = paymentStatusClassMap[s] ?? 'status-pending-approval';
  let label = s;
  if (s === 'Pending Approval') {
    label = `Pending Approval (${currentSigs || 0}/${requiredSigs || 1})`;
  }

  if (s === 'Scheduled' && showScheduledFor) {
    return (
      <div className="inline-flex flex-col items-start gap-1">
        <span className={`payment-badge ${cls}`}>
          <span className="dot" />
          {label}
        </span>
        <span className="text-[11px] font-mono text-sky-700 dark:text-sky-300 font-medium whitespace-nowrap">
          {formatScheduledSubtitle(scheduledFor)}
        </span>
      </div>
    );
  }

  return (
    <span className={`payment-badge ${cls}`}>
      <span className="dot" />
      {label}
    </span>
  );
};

/* --------------------- FR-019 Milestone 1 (Award) banner --------------------- */

export const etherscanTxUrl = (txHash?: string | null, chainId?: number) => {
  if (!txHash) return null;
  const base = chainId === 1 ? 'https://etherscan.io' : 'https://sepolia.etherscan.io';
  return `${base}/tx/${txHash}`;
};

const fmtHash = (h?: string | null) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : '');

const ACCEPTANCE_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

/** Fetches the Milestone 1 (Statutory Award) blockchain record for a case and its grace status. */
export const useMilestone1Record = (caseId?: string) => {
  const [record, setRecord] = useState<any | null | 'loading'>(caseId ? 'loading' : null);
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (!caseId) {
      setRecord(null);
      setAcceptedAt(null);
      return;
    }
    let isMounted = true;
    setRecord('loading');

    Promise.all([
      blockchainApi.getRecords().catch(() => ({ records: [] })),
      compensationApi.getAllOfferLetters({ limit: 200 } as any).catch(() => ({ offers: [], offerLetters: [] })),
      landAcquisitionApi.getCaseById(caseId).catch(() => null),
    ])
      .then(([recordsRes, offersRes, caseRes]: [any, any, any]) => {
        if (!isMounted) return;
        const list: any[] = recordsRes?.records || [];
        const m1Rec = list.find((r) => r.caseId === caseId && (r.milestone ?? 'AWARD') === 'AWARD') ?? null;
        setRecord(m1Rec);

        const offers: any[] = offersRes?.offers || offersRes?.offerLetters || [];
        const foundOffer = offers.find((o: any) => o.caseId === caseId);
        const caseObj = caseRes?.data || caseRes?.case || caseRes;
        const caseOffer = caseObj?.offerLetters?.find((o: any) => o.status === 'ACCEPTED' || o.acceptedAt);
        const accTime = foundOffer?.acceptedAt || caseOffer?.acceptedAt || null;
        setAcceptedAt(accTime);
      })
      .catch(() => {
        if (isMounted) {
          setRecord(null);
          setAcceptedAt(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [caseId]);

  // Tick clock every 1s to keep countdown active
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1_000);
    return () => clearInterval(timer);
  }, []);

  const loaded = record !== 'loading';
  const rawStatus = String((record as any)?.status || '').toUpperCase().replace(/[\s_]+/g, '_');
  const isM1Published = loaded && !!record && rawStatus === 'PUBLISHED';

  const acceptedAtMs = acceptedAt ? new Date(acceptedAt).getTime() : null;
  const graceEndsAtMs = acceptedAtMs != null ? acceptedAtMs + ACCEPTANCE_GRACE_PERIOD_MS : null;
  const isGraceLocked = !isM1Published && graceEndsAtMs != null && now < graceEndsAtMs;
  const remainingMs = isGraceLocked && graceEndsAtMs != null ? Math.max(0, graceEndsAtMs - now) : 0;
  const countdown = isGraceLocked ? formatGraceCountdown(remainingMs) : '';

  return {
    record: loaded ? (record as any) : null,
    loading: !loaded,
    isM1Published,
    isGraceLocked,
    remainingMs,
    countdown,
    graceEndsAt: graceEndsAtMs,
    acceptedAt,
  };
};

/**
 * Blockchain status banner for Milestone 1 (Statutory Award notarization).
 * Green tonal when the award is anchored on-chain (with an Etherscan link),
 * amber tonal when locked during statutory 24-hour acceptance cancellation grace period,
 * and Electric Sky tonal when grace period has concluded and award is ready to publish.
 */
export const Milestone1Banner: React.FC<{ caseId: string }> = ({ caseId }) => {
  const navigate = useNavigate();
  const { record, loading, isM1Published, isGraceLocked, countdown } = useMilestone1Record(caseId);

  if (loading || !caseId) return null;

  if (isM1Published) {
    const url = etherscanTxUrl(record.transactionHash);
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="min-w-0 text-xs">
          <div className="font-bold text-emerald-700 dark:text-emerald-300">
            Statutory Award Notarized on Blockchain (Milestone 1)
          </div>
          <div className="text-md-on-surface-variant mt-0.5 flex items-center gap-2 flex-wrap">
            <span>Form H award anchored on Sepolia · {new Date(record.publishedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono inline-flex items-center gap-1.5 text-md-primary font-semibold hover:underline"
              >
                {fmtHash(record.transactionHash)}
                <ExternalLink size={12} className="shrink-0" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isGraceLocked) {
    return (
      <div className="bg-amber-500/15 dark:bg-amber-500/25 border-2 border-amber-500/50 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-2.5 min-w-0">
          <Lock size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-amber-500 text-white dark:bg-amber-400 dark:text-gray-900 shadow-2xs">
                LOCKED
              </span>
              <span className="font-bold text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
                Milestone 1 Pending On-Chain Notarization
              </span>
            </div>
            <div className="text-md-on-surface-variant mt-1 leading-relaxed">
              Disbursement initiation is locked. The statutory award (Form H) is within its 24-hour acceptance cancellation grace period{countdown ? ` (${countdown} left)` : ''} before on-chain notarization can proceed.
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant="filled"
          disabled
          title={`Milestone 1 unlocks when the statutory 24-hour acceptance grace period ends (${countdown} left)`}
          className="shrink-0 !bg-amber-600 !text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm self-start sm:self-center"
        >
          <Lock size={14} />
          <span>Locked ({countdown || 'Grace Period'})</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-sky-500/10 dark:bg-sky-500/20 border-2 border-sky-500/40 dark:border-sky-500/50 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
      <div className="flex items-start gap-2.5 min-w-0">
        <UploadCloud size={20} className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-sky-600 text-white dark:bg-sky-500 dark:text-gray-900 shadow-2xs">
              READY
            </span>
            <span className="font-bold text-sky-950 dark:text-sky-200 text-xs sm:text-sm">
              Milestone 1 Ready for On-Chain Notarization
            </span>
          </div>
          <div className="text-md-on-surface-variant mt-1 leading-relaxed">
            Disbursement initiation is locked. The statutory award (Form H) must be notarized on the blockchain first before bank transfer can proceed.
          </div>
        </div>
      </div>
      <Button
        size="sm"
        variant="filled"
        className="shrink-0 !bg-sky-600 hover:!bg-sky-700 !text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm self-start sm:self-center cursor-pointer"
        onClick={() => navigate(`/admin/blockchain/publish?caseId=${encodeURIComponent(caseId)}`)}
      >
        <UploadCloud size={14} />
        <span>Publish Milestone 1</span>
      </Button>
    </div>
  );
};

/** Fetches the Milestone 2 (Statutory Settlement) blockchain record for a case. */
export const useMilestone2Record = (caseId?: string) => {
  const [record, setRecord] = useState<any | null | 'loading'>(caseId ? 'loading' : null);

  useEffect(() => {
    if (!caseId) {
      setRecord(null);
      return;
    }
    let isMounted = true;
    setRecord('loading');

    blockchainApi
      .getRecords()
      .then((recordsRes: any) => {
        if (!isMounted) return;
        const list: any[] = recordsRes?.records || [];
        const m2Rec = list.find((r) => r.caseId === caseId && ((r.milestone ?? 'SETTLEMENT') === 'SETTLEMENT' || r.milestone === 'M2')) ?? null;
        setRecord(m2Rec);
      })
      .catch(() => {
        if (isMounted) setRecord(null);
      });

    return () => {
      isMounted = false;
    };
  }, [caseId]);

  const loaded = record !== 'loading';
  const rawStatus = String((record as any)?.status || '').toUpperCase().replace(/[\s_]+/g, '_');
  const isM2Published = loaded && !!record && rawStatus === 'PUBLISHED';

  return {
    record: loaded ? (record as any) : null,
    loading: !loaded,
    isM2Published,
  };
};

/**
 * Blockchain status banner for Milestone 2 (Statutory Settlement notarization).
 * Displayed directly under Milestone 1 banner on top of the payment modal.
 * Green tonal when anchored on-chain with an Etherscan link,
 * Electric Sky tonal with [Publish Milestone 2] button when ready to publish.
 *
 * FR-005 / FR-019: the settlement anchor is locked until the case reaches PAID —
 * funds confirmed received — so nothing M2-related renders at any other status,
 * including a record published before this rule was enforced server-side.
 * The backend `assertSettlementPaid` is the real gate; this is the mirror.
 */
export const Milestone2Banner: React.FC<{ caseId: string; status?: string }> = ({ caseId, status }) => {
  const navigate = useNavigate();
  const { record, loading, isM2Published } = useMilestone2Record(caseId);

  if (normalizePaymentStatus(status || '') !== 'Paid') return null;
  if (loading || !caseId) return null;

  if (isM2Published) {
    const url = etherscanTxUrl(record.transactionHash);
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="min-w-0 text-xs">
          <div className="font-bold text-emerald-700 dark:text-emerald-300">
            Statutory Settlement Notarized on Blockchain (Milestone 2)
          </div>
          <div className="text-md-on-surface-variant mt-0.5 flex items-center gap-2 flex-wrap">
            <span>Settlement receipt anchored on Sepolia · {new Date(record.publishedAt || record.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono inline-flex items-center gap-1.5 text-md-primary font-semibold hover:underline"
              >
                {fmtHash(record.transactionHash)}
                <ExternalLink size={12} className="shrink-0" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-sky-500/10 dark:bg-sky-500/20 border-2 border-sky-500/40 dark:border-sky-500/50 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
      <div className="flex items-start gap-2.5 min-w-0">
        <UploadCloud size={20} className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-sky-600 text-white dark:bg-sky-500 dark:text-gray-900 shadow-2xs">
              READY
            </span>
            <span className="font-bold text-sky-950 dark:text-sky-200 text-xs sm:text-sm">
              Milestone 2 Ready for On-Chain Notarization
            </span>
          </div>
          <div className="text-md-on-surface-variant mt-1 leading-relaxed">
            Disbursement completed via RENTAS RTGS. The statutory settlement receipt is ready to be permanently notarized on the blockchain.
          </div>
        </div>
      </div>
      <Button
        size="sm"
        variant="filled"
        className="shrink-0 !bg-sky-600 hover:!bg-sky-700 !text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm self-start sm:self-center cursor-pointer"
        onClick={() => navigate(`/admin/blockchain/publish?caseId=${encodeURIComponent(caseId)}`)}
      >
        <UploadCloud size={14} />
        <span>Publish Milestone 2</span>
      </Button>
    </div>
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
  const { isM1Published, isGraceLocked, countdown } = useMilestone1Record(pc?.caseId);
  const hasAutoTriggeredRef = useRef(false);

  useEffect(() => {
    hasAutoTriggeredRef.current = false;
  }, [pc?.caseId]);

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

  const norm = pc ? normalizePaymentStatus(pc.status) : '';
  // A co-owned case carries more than one beneficiary row; only then does the
  // stacked apportionment section add anything over the single-owner tiles.
  const isCoOwned = Boolean(pc?.beneficiaries && pc.beneficiaries.length > 1);
  const transferSucceedDate =
    norm === 'Transfer Succeed' && pc ? pc.receipt?.generatedAt || pc.updatedAt || pc.createdAt : null;
  const succeedDateMs = transferSucceedDate ? new Date(transferSucceedDate).getTime() : Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const autoConfirmAtMs = succeedDateMs + SEVEN_DAYS_MS;
  const nowMs = Date.now();
  const remainingMs = Math.max(0, autoConfirmAtMs - nowMs);
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  const remainingHours = Math.max(0, Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
  const isAutoConfirmEligible = transferSucceedDate != null && nowMs >= autoConfirmAtMs;

  useEffect(() => {
    if (!pc) return;
    if (norm === 'Transfer Succeed' && isAutoConfirmEligible && !hasAutoTriggeredRef.current) {
      hasAutoTriggeredRef.current = true;
      paymentApi
        .confirmReceipt({ caseId: pc.caseId, isAutoOrAdminOverride: true })
        .then(() => {
          notify({
            type: 'success',
            title: 'Payment Auto-Confirmed',
            message: `7-day statutory window elapsed for Case ${pc.caseId}. System auto-confirmed receipt and marked as Paid.`,
          });
          onAction?.('confirm-receipt', pc);
        })
        .catch((err: any) => {
          console.error('[paymentModals] Auto-confirm error:', err);
        });
    }
  }, [norm, isAutoConfirmEligible, pc?.caseId, notify, onAction, pc]);

  if (!pc) return null;

  const signed = hasSignedOrInitiated(pc, identityId);
  const left = signaturesLeft(pc);
  const isSysAdmin = user?.role === 'SYSTEM_ADMINISTRATOR';
  const canCancel = CANCELLABLE_STATUSES.includes(norm) && !isSysAdmin;

  // FR-015: the member's uploaded bank statement (latest only) is reviewable
  // by the GA whenever the case is sitting in Disputed.
  const latestDisputeRemark = [...(pc.failedTransactions ?? [])]
    .reverse()
    .find((ft) => typeof ft.errorLog === 'string' && ft.errorLog.startsWith('DISPUTE'))
    ?.errorLog?.replace(/^DISPUTE:\s*/, '');
  const hasDisputeStatement = norm === 'Disputed' && Boolean(pc.disputeDocumentPath);

  const bankEvents = bankBeneficiaryEvents(pc);

  const downloadDisputeStatement = async () => {
    try {
      const blob = await paymentApi.downloadDisputeStatement(pc.caseId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pc.disputeDocumentName || `dispute-statement-${pc.caseId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify({ type: 'success', title: 'Statement downloaded', message: `Bank statement for case ${pc.caseId}.` });
    } catch (e: any) {
      notify({ type: 'error', title: 'Download failed', message: e.message || 'Could not download the dispute statement.' });
    }
  };

  // The record modal is too small for an embedded PDF reader — the statement
  // opens in a full browser tab so the GA can inspect it properly.
  const openDisputeStatementInNewTab = async () => {
    try {
      const blob = await paymentApi.downloadDisputeStatement(pc.caseId);
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      window.open(url, '_blank', 'noopener');
      notify({ type: 'general', title: 'Statement opened', message: 'The bank statement PDF opened in a new tab.' });
    } catch (e: any) {
      notify({ type: 'error', title: 'Preview failed', message: e.message || 'Could not open the dispute statement.' });
    }
  };

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
            disabled={!hasBankDetails(pc) || !isM1Published}
            title={
              !hasBankDetails(pc)
                ? 'Awaiting beneficiary bank details before transfer can be initiated'
                : !isM1Published
                ? isGraceLocked
                  ? `Initiation is locked: 24-hour acceptance cancellation grace period active (${countdown} left)`
                  : 'Initiation is locked: Milestone 1 (Statutory Award) must be published on the blockchain first'
                : undefined
            }
            onClick={() => {
              onClose();
              onAction?.('initiate', pc);
            }}
          >
            <Send size={15} />
            <span>{isM1Published ? 'Initiate Transfer' : 'Initiate Transfer (Awaiting M1 Notarization)'}</span>
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
        // FR-018 (replaced): the single SOP — a GA verifies the rejection reason
        // was addressed and returns the case to Pending Approval.
        return (
          <Button
            variant="filled"
            size="md"
            onClick={() => {
              onClose();
              onAction?.('resolve-rejection', pc);
            }}
          >
            <BadgeCheck size={15} />
            <span>Mark as Resolved</span>
          </Button>
        );

      case 'Cancelled':
        // Cancelled is terminal: the case is dead and has no exit path, so no
        // main action is offered. Details stay view-only.
        return null;

      case 'Transfer Failed': {
        const latestFt = pc.failedTransactions?.[pc.failedTransactions.length - 1];
        const isCat1 = isCategory1BankFailure(latestFt?.errorLog);

        if (isCat1) {
          // Category 1: Recipient account fault -> only Request New Bank Details
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
        }

        // Category 2: Bank / Gateway / Network fault -> only Schedule Next Working Day
        return (
          <Button
            variant="filled"
            size="md"
            onClick={() => {
              onClose();
              onAction?.('schedule', pc);
            }}
          >
            <span>Schedule Next Working Day</span>
          </Button>
        );
      }

      case 'Transfer Succeed':
        // FR lock: at Transfer Succeed, no main action button.
        // Auto-triggers confirm receipt after 7 days; modal shows remaining days/hours.
        return null;

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
        // Once Paid, settlement is recorded; receipt is accessible via clickable bank reference in Transfer Successful card.
        return null;

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
        {/* FR-019: Milestone 1 statutory-award blockchain banner */}
        <Milestone1Banner caseId={pc.caseId} />

        {/* Milestone 2 statutory-settlement blockchain banner */}
        <Milestone2Banner caseId={pc.caseId} status={pc.status} />

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

          <CaseTimestamps pc={pc} caseData={caseData} />
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
              <div className="value mono font-mono">{pc.myKadNumber || '—'}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Phone</div>
              <div className="value mono font-mono">
                {norm === 'Bank Details Pending' || norm === 'New Bank Details Pending'
                  ? '—'
                  : formatLocalPhoneDisplay(pc.phoneNumber)}
              </div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Bank</div>
              <div className="value">
                {norm === 'Bank Details Pending' || norm === 'New Bank Details Pending'
                  ? '—'
                  : pc.bankName || '—'}
              </div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Account</div>
              <div className="value mono font-mono">
                {norm === 'Bank Details Pending' || norm === 'New Bank Details Pending'
                  ? '—'
                  : pc.accountNumber || '—'}
              </div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Award Amount</div>
              <div className="value font-bold text-md-primary">{fmtAmount(pc.amount)}</div>
            </div>
            <div className="payment-detail-item">
              <div className="label">Payment Status</div>
              <div className="value">{paymentBadge(norm, pc.currentSignatures, pc.requiredSignatures, pc.scheduledFor, true)}</div>
            </div>
          </div>
        </div>
        {/* Co-owned case: one award split by percentage, so every owner's share
            and payout account is listed instead of collapsing to one name. */}
        {isCoOwned && (
          <div className="rounded-xl border border-md-outline/20 bg-md-surface-container-low p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-md-on-surface-variant mb-3">
              Co-owner apportionment
            </div>
            <OwnerStack owners={pc.beneficiaries} />
          </div>
        )}
        {/* FR-015: Member-uploaded dispute bank statement — reviewed in a full
            browser tab (or downloaded); never embedded inside the record modal. */}
        {hasDisputeStatement && (
          <div className="bg-amber-500/5 rounded-xl p-4 border border-amber-500/25 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300">
                <FileText size={16} />
                <span>Member Bank Statement (Dispute Evidence)</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="tonal" size="sm" onClick={openDisputeStatementInNewTab}>
                  <ExternalLink size={14} />
                  <span>Open PDF in New Tab</span>
                </Button>
                <Button variant="outlined" size="sm" onClick={downloadDisputeStatement}>
                  <Download size={14} />
                  <span>Download</span>
                </Button>
              </div>
            </div>

            {latestDisputeRemark && (
              <div className="text-xs text-md-on-surface-variant bg-md-surface-container-low rounded-lg px-3 py-2 border border-md-outline/10">
                <span className="font-bold text-md-on-surface">Member remark: </span>
                {latestDisputeRemark}
              </div>
            )}

            <div className="text-[11px] text-md-on-surface-variant flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-md-on-surface truncate max-w-[320px]">
                {pc.disputeDocumentName}
              </span>
              {pc.disputeUploadedAt && (
                <span>· uploaded {new Date(pc.disputeUploadedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </div>
          </div>
        )}

        {/* Governance audit trail — every Government Admin action on this record,
            grouped by multi-sig cycle (FR-020): superseded cycles render muted. */}
        <div>
          <div className="label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--md-on-surface-variant)', marginBottom: 8 }}>
            From Government Admin{' '}
            <span className="normal-case tracking-normal">
              ({pc.currentSignatures || 0}/{pc.requiredSignatures || 1} Signatures · Cycle {pc.cycle ?? 1})
            </span>
          </div>
          <div className="space-y-2">
            {(pc.authorisations ?? []).length === 0 && (
              <p className="text-xs text-md-on-surface-variant">No approvals recorded yet.</p>
            )}
            {(() => {
              const auths = pc.authorisations ?? [];
              const activeCycle = pc.cycle ?? 1;
              const cycles = Array.from(new Set(auths.map((a) => a.cycle ?? 1))).sort((x, y) => y - x);
              return cycles.map((cycleNum) => {
                const isSuperseded = cycleNum !== activeCycle;
                const cycleAuths = byCreatedAtAsc(auths.filter((a) => (a.cycle ?? 1) === cycleNum));
                return (
                  <div
                    key={cycleNum}
                    className={`space-y-2 rounded-xl p-2.5 border ${
                      isSuperseded
                        ? 'bg-md-surface-container/40 border-md-outline/10 opacity-60 grayscale-[0.35]'
                        : 'border-transparent'
                    }`}
                  >
                    {isSuperseded && (
                      <div className="text-[10px] font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-1.5 px-1">
                        <Lock size={11} className="shrink-0" />
                        Cycle {cycleNum} (Superseded — bank details replaced)
                      </div>
                    )}
                    {cycleAuths.map((a, i) => {
                      const bad = isRejectionAction(a.action);
                      // Only real GA-typed reasons (reject / cancel) render here —
                      // system boilerplate (resolved / executed) stays out of the audit list.
                      const showReason =
                        ['reject', 'cancel'].includes((a.action || '').trim().toLowerCase()) && a.reason;
                      return (
                        <div key={`${cycleNum}-${i}`} className="flex items-start justify-between gap-3 text-xs bg-md-surface-container-low rounded-xl px-4 py-2.5 border border-md-outline/10">
                          <div className="flex items-start gap-2 min-w-0">
                            {bad ? (
                              <XCircle size={14} className="text-md-error shrink-0 mt-0.5" />
                            ) : (
                              <CheckCircle2 size={14} className="text-md-success-text shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0">
                              <span className={`font-semibold ${bad ? 'text-md-error' : 'text-md-success-text'}`}>
                                {formatActionLabel(a.action)}
                              </span>
                              <span className="text-md-on-surface-variant font-medium text-[11px]">
                                {' '}· {formatAdminDisplay(a.adminId, (a as any).adminName)}
                              </span>
                              {showReason && (
                                <div className="text-[11px] text-md-on-surface-variant italic mt-0.5 break-words">
                                  {formatReasonLabel(a.reason)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-md-on-surface-variant shrink-0">{fmtDate(a.createdAt)}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Bank-side and beneficiary-side event history (successful transfers,
            bank returns, member disputes) — GA actions live in the list above. */}
        {bankEvents.length > 0 && (
          <div>
            <div className="label" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--md-on-surface-variant)', marginBottom: 8 }}>
              From Bank / Beneficiary
            </div>
            <div className="space-y-2.5">
              {bankEvents.map((ev, i) => {
                if (ev.kind === 'success') {
                  const bankRef = pc.receipt?.bankReferenceNumber || `BNK-${pc.caseId.replace(/[^A-Z0-9]/gi, '')}`;
                  return (
                    <div
                      key={i}
                      className="bg-emerald-500/10 dark:bg-emerald-500/20 border-2 border-emerald-500/30 rounded-xl p-4 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="font-bold text-sm text-emerald-950 dark:text-emerald-100">
                            Transfer Successful
                          </span>
                          <span className="text-xs text-md-on-surface-variant font-medium">
                            · {fmtDate(ev.date)}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white dark:bg-emerald-500 dark:text-gray-900 shadow-2xs">
                          RENTAS RTGS
                        </span>
                      </div>

                      <div className="text-xs text-md-on-surface space-y-1.5 pt-1.5 border-t border-emerald-500/20">
                        <div className="text-emerald-900 dark:text-emerald-200 font-medium">
                          Bank cleared the fund release · Settlement Reference:
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => viewReceiptInNewTab(pc, notify)}
                            className="font-mono text-sm sm:text-base font-bold text-md-primary underline underline-offset-4 inline-flex items-center gap-1.5 hover:text-md-primary/80 transition-colors cursor-pointer group"
                            title="Click to view official payment receipt in a new tab"
                          >
                            <span>{bankRef}</span>
                            <ArrowUpRight size={16} className="text-md-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                          </button>
                        </div>
                        <div className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                          Click reference above to inspect the official statutory settlement receipt PDF in a new browser tab.
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={i} className="bg-md-surface-container-low rounded-xl px-4 py-2.5 border border-md-outline/10 text-xs">
                    <div className="flex items-center gap-1.5 mb-1">
                      {ev.kind === 'dispute' ? (
                        <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                      ) : (
                        <XCircle size={13} className="text-md-error shrink-0" />
                      )}
                      <span className="font-semibold text-md-on-surface">{ev.title}</span>
                      <span className="text-[11px] text-md-on-surface-variant">· {fmtDate(ev.date)}</span>
                    </div>
                    <div className="text-md-on-surface break-words">{ev.detail}</div>
                    {ev.resolved && (
                      <div className="text-[11px] text-md-on-success mt-1">
                        Resolution: {formatResolutionLabel(ev.resolved)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FR-014: archived receipts from voided dispute cycles. When a GA
            resolves a dispute by reinitiating or requesting new bank details,
            the disputed cycle's frozen receipt is preserved here. */}
        {(pc.receiptArchives ?? []).length > 0 && (
          <div className="bg-md-surface-container-low rounded-xl p-4 border border-md-outline/10 space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-md-on-surface-variant">
              <Archive size={15} />
              <span>Archived Settlement Receipts ({pc.receiptArchives!.length})</span>
            </div>
            <div className="space-y-2">
              {pc.receiptArchives!.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 bg-md-surface-container rounded-lg px-3 py-2 border border-md-outline/10">
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-semibold text-md-on-surface truncate">
                      {a.bankReferenceNumber}
                    </div>
                    <div className="text-[11px] text-md-on-surface-variant">
                      Frozen {fmtDate(a.generatedAt)} · superseded {fmtDate(a.archivedAt)}
                    </div>
                  </div>
                  <Button
                    variant="outlined"
                    size="sm"
                    onClick={async () => {
                      try {
                        const blob = await paymentApi.downloadArchivedReceipt(a.id);
                        const url = URL.createObjectURL(blob);
                        const el = document.createElement('a');
                        el.href = url;
                        el.download = `archived-receipt-${a.bankReferenceNumber}.pdf`;
                        document.body.appendChild(el);
                        el.click();
                        document.body.removeChild(el);
                        URL.revokeObjectURL(url);
                        notify({ type: 'success', title: 'Archived receipt downloaded', message: `Frozen receipt ${a.bankReferenceNumber}.` });
                      } catch (e: any) {
                        notify({ type: 'error', title: 'Download failed', message: e.message || 'Could not download the archived receipt.' });
                      }
                    }}
                  >
                    <Download size={14} />
                    <span>Download</span>
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-md-on-surface-variant leading-relaxed">
              These are frozen receipts from settlement cycles voided by a dispute resolution. Their SHA-256 anchors remain
              valid for the corresponding blockchain Milestone 2 records.
            </p>
          </div>
        )}

        {/* High-visibility 7-day statutory window banner (FR-005) */}
        {norm === 'Transfer Succeed' && (
          <div className="bg-amber-500/10 dark:bg-amber-500/20 border-2 border-amber-500/40 dark:border-amber-500/50 rounded-xl p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white dark:bg-amber-400 dark:text-gray-900 shadow-2xs">
                  7-DAY STATUTORY WINDOW
                </span>
                <span className="font-bold text-amber-950 dark:text-amber-100 text-xs sm:text-sm">
                  Member confirmation window active. Admin manual confirmation unlocks in {remainingDays} day(s) (7-day rule).
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-900 dark:text-amber-300 bg-amber-500/20 dark:bg-amber-500/30 px-2.5 py-1 rounded-lg border border-amber-500/30">
                {isAutoConfirmEligible ? 'Auto-Confirming Now...' : `${remainingDays} day(s) remaining (${remainingHours}h)`}
              </span>
            </div>
            <p className="text-xs text-md-on-surface-variant leading-relaxed">
              Displaced community member confirmation is active. Funds were successfully transmitted via RENTAS RTGS.
            </p>
            <div className="pt-2 border-t border-amber-500/20 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200 font-medium">
              <Clock size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="font-bold text-amber-950 dark:text-amber-100">Next for Government Admin: </strong>
                No action required. If the member does not confirm within 7 days, the system automatically triggers receipt confirmation, transitions the case to <strong className="font-semibold text-emerald-700 dark:text-emerald-300">Paid</strong>, and unlocks Milestone 2 blockchain notarization.
              </span>
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
  const { isM1Published: hookM1Published } = useMilestone1Record(pc?.caseId);
  const isM1Published = pc?.isM1Published ?? hookM1Published;

  const confirm = async () => {
    if (!pc || !isM1Published) return;
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
      confirmText={isM1Published ? 'Initiate Transfer' : 'Awaiting M1 Notarization'}
      confirmDisabled={!isM1Published}
      confirmLoading={loading}
      onConfirm={confirm}
    >
      {pc && (
        <div className="space-y-4">
          <Milestone1Banner caseId={pc.caseId} />

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
              Initiating as: <strong className="text-md-on-surface">{identityLabel}</strong>
            </div>
          </div>

          <CaseTimestamps pc={pc} />
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
  const { notify } = useNotification();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setChecked(false);
      setLoading(false);
      setIsSuccess(false);
    }
  }, [isOpen]);

  useGSAP(() => {
    if (isSuccess && successRef.current) {
      gsap.fromTo(
        successRef.current,
        { opacity: 0, scale: 0.85, y: 12 },
        { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'back.out(1.6)' }
      );
    }
  }, [isSuccess]);

  const handleConfirm = async () => {
    if (!checked || loading || isSuccess || !pc) return;
    setLoading(true);
    try {
      await onConfirm();
      setIsSuccess(true);
      notify({
        type: 'success',
        title: 'Payment Dispatched to Bank',
        message: `Case ${pc.caseId} confirmed and dispatched to the commercial bank clearing queue.`,
      });
    } catch (err: any) {
      notify({
        type: 'error',
        title: 'Bank Dispatch Failed',
        message: err.message || 'Execution failed. Please check network and permissions.',
      });
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
      title={isSuccess ? 'Disbursement Confirmed' : 'Final Disbursement Release Order'}
      subtitle={pc ? `Case ${pc.caseId} · ${fmtAmount(pc.amount)}` : ''}
      footer={
        !isSuccess ? (
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
        ) : null
      }
    >
      {pc && (
        isSuccess ? (
          <div ref={successRef} className="py-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={36} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-md-on-surface">Payment Order Dispatched Successfully</h3>
              <p className="text-xs text-md-on-surface-variant max-w-sm mt-1 leading-relaxed">
                Irrevocable clearing instruction for <strong>{pc.caseId}</strong> ({fmtAmount(pc.amount)}) has been transmitted to {pc.bankName || 'the beneficiary bank'}.
              </p>
            </div>
          </div>
        ) : (
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
              <span className="font-semibold text-md-success-text flex items-center gap-1.5">
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
        )
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
    await paymentApi.confirmExecution({ caseId: pc.caseId, adminId: identityId });
    setTimeout(() => {
      setShowFinalModal(false);
      onClose();
      onDone();
    }, 1100);
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
            <Milestone1Banner caseId={pc.caseId} />

            <div className="payment-detail-item">
              <div className="label">Multi-signature progress</div>
              <div className="value">
                {current} of {required} signatures
              </div>
              <div className="text-xs text-md-on-surface-variant mt-1">
                {signaturesLeft(pc)} left to meet the threshold
              </div>
            </div>

            {/* Active-cycle signatures only. A superseded cycle voids prior
                signatures (FR-020), so Cycle-1 actions must not appear here —
                the View Details modal keeps the full cycle-grouped history. */}
            <div className="space-y-1.5 text-sm">
              {byCreatedAtAsc(
                (pc.authorisations ?? []).filter((a) => (a.cycle ?? 1) === (pc.cycle ?? 1))
              ).map((a, i) => {
                const isRejection = isRejectionAction(a.action);
                return (
                  <div key={i} className="flex items-center gap-2">
                    {isRejection ? (
                      <XCircle size={14} className="text-md-error shrink-0" />
                    ) : (
                      <CheckCircle2 size={14} className="text-md-success-text shrink-0" />
                    )}
                    <span className={`font-medium ${isRejection ? 'text-md-error' : 'text-md-on-surface'}`}>
                      {formatAdminDisplay(a.adminId, (a as any).adminName)}
                    </span>
                    <span className="text-md-on-surface-variant">— {formatActionLabel(a.action)}</span>
                  </div>
                );
              })}
              {!(pc.authorisations ?? []).some((a) => (a.cycle ?? 1) === (pc.cycle ?? 1)) && (
                <p className="text-md-on-surface-variant">No signatures recorded yet.</p>
              )}
            </div>

            {isSoDBlocked ? (
              <div className="text-sm bg-md-warning/10 border border-md-warning/30 rounded-xl px-4 py-3 text-md-on-warning">
                You cannot authorise a transfer you initiated or previously signed. (Segregation of duties)
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm bg-md-surface-container-low rounded-xl px-4 py-3 border border-md-outline/10">
                <Lock size={13} />
                Signing as: <strong className="text-md-on-surface">{identityLabel}</strong>
              </div>
            )}

            {reachesThreshold && (
              <div className="flex items-start gap-2 text-sm bg-md-primary/10 border border-md-primary/30 rounded-xl px-4 py-3 text-md-on-surface">
                <ShieldCheck size={16} className="shrink-0 mt-0.5 text-md-primary" />
                <div>
                  <div className="font-semibold text-md-on-surface">This signature completes the threshold:</div>
                  <ul className="list-disc pl-5 mt-1 space-y-0.5">
                    <li>Transfer status becomes <strong>Authorised</strong>.</li>
                    <li>You are the final authoriser — a release confirmation is requested next.</li>
                    <li>After confirmation, the payment is dispatched to the commercial bank.</li>
                  </ul>
                </div>
              </div>
            )}

            <CaseTimestamps pc={pc} />
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

/* Cancel is terminal and irreversible (payment → Cancelled, case → Case Closed),
 * so the list is restricted to genuine "this acquisition is dead" events. The
 * only path forward after any of them is to open a new case and restart the
 * whole process — there is no in-place SOP. A landowner bank-account change goes
 * through the non-destructive Request New Bank Details flow instead. */
export const CANCELLATION_REASONS = [
  {
    value: 'COURT_ORDER_OR_INJUNCTION',
    label: 'Court order or legal injunction halts the acquisition',
  },
  {
    value: 'AWARD_OVERTURNED_ON_APPEAL',
    label: 'Compensation award overturned or revised on appeal / objection',
  },
  {
    value: 'BENEFICIARY_INELIGIBLE_OR_FRAUD',
    label: 'Beneficiary ineligibility or fraud confirmed after verification',
  },
  {
    value: 'ACQUISITION_DISCONTINUED',
    label: 'Land acquisition discontinued — land no longer required',
  },
];

/* ------------------------------- Reject Transfer ------------------------------- */

/**
 * FR-018 (revoked & replaced 2026-09-12): GA rejection reasons are GOVERNANCE
 * reasons — why this admin will not let the transfer proceed. Bank-side codes
 * (recipient account invalid/closed, name mismatch) belong to the bank portal.
 * "Other" requires a compulsory typed reason; a rejection can never be
 * submitted without one.
 */
export const REJECTION_REASONS = [
  {
    value: 'BENEFICIARY_DETAILS_MISMATCH',
    label: 'Beneficiary name or bank details do not match the statutory land award records',
  },
  {
    value: 'AWARD_VERIFICATION_FAILED',
    label: 'Award amount or supporting documents failed pre-disbursement verification',
  },
  {
    value: 'DUPLICATE_DISBURSEMENT_RISK',
    label: 'Possible duplicate disbursement instruction detected for this case',
  },
];

const OTHER_REASON = 'OTHER';

export const RejectTransferModal: React.FC<MutatingModalProps> = ({ pc, onClose, onDone }) => {
  const { identityId } = useAdminIdentity();
  const { loading, setLoading, notify } = useMutationState();
  const [selectedReason, setSelectedReason] = useState('');
  const [otherText, setOtherText] = useState('');

  const isOther = selectedReason === OTHER_REASON;
  const finalReason = isOther ? otherText.trim() : selectedReason;

  const confirm = async () => {
    if (!pc || !finalReason) return;
    setLoading(true);
    try {
      await paymentApi.reject({ caseId: pc.caseId, adminId: identityId, reason: finalReason });
      notify({
        type: 'success',
        title: 'Transfer rejected',
        message: `Case ${pc.caseId} → Transfer Rejected. Listed in Failed Transactions with a single "Mark as Resolved" SOP.`,
      });
      setSelectedReason('');
      setOtherText('');
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
      confirmDisabled={!finalReason}
      onConfirm={finalReason ? confirm : undefined}
    >
      {pc && (
        <div className="space-y-4">
          <div className="payment-detail-item">
            <div className="label">Record</div>
            <div className="value">{pc.accountHolderName || pc.beneficiaryId} · {fmtAmount(pc.amount)}</div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-md-on-surface flex items-center gap-1">
              <span>Governance Rejection Reason (Required)</span>
              <span className="text-md-error">*</span>
            </label>
            <Select
              label="Rejection Reason"
              placeholder="Select a rejection reason…"
              options={[
                ...REJECTION_REASONS.map((r) => ({ value: r.value, label: r.label })),
                { value: OTHER_REASON, label: 'Other — I will type the reason myself' },
              ]}
              value={selectedReason}
              onChange={(val) => setSelectedReason(val)}
              wrapLabels
            />
            {isOther && (
              <div className="space-y-1.5 pt-1">
                <Textarea
                  label="State the Rejection Reason"
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  rows={3}
                  placeholder="Explain why this transfer must not proceed (required)…"
                />
              </div>
            )}
          </div>
          <div className="text-xs bg-md-surface-container-highest rounded-lg px-3 py-2 text-md-on-surface-variant flex items-start gap-1.5">
            <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-600" />
            <span>
              <span className="font-semibold text-md-on-surface">Only permitted SOP: </span>
              Mark as Resolved in Failed Transactions — a Government Admin confirms the reason was
              addressed and the case returns to Pending Approval with its prior signatures retained.
            </span>
          </div>
        </div>
      )}
    </Modal>
  );
};

/* ------------------------- Resolve Rejected Transfer ------------------------- */

export const ResolveRejectionModal: React.FC<MutatingModalProps> = ({ pc, onClose, onDone }) => {
  const { identityId } = useAdminIdentity();
  const { loading, setLoading, notify } = useMutationState();

  const confirm = async () => {
    if (!pc) return;
    setLoading(true);
    try {
      await paymentApi.resolveRejection({ caseId: pc.caseId, adminId: identityId });
      notify({
        type: 'success',
        title: 'Rejection resolved',
        message: `Case ${pc.caseId} returned to Pending Approval (${pc.currentSignatures || 0}/${pc.requiredSignatures || 1} prior signatures retained).`,
      });
      onClose();
      onDone();
    } catch (e: any) {
      notify({ type: 'error', title: 'Resolve failed', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const rejectionReason = [...(pc?.authorisations ?? [])]
    .reverse()
    .find((a) => a.action === 'reject')?.reason;

  return (
    <Modal
      isOpen={Boolean(pc)}
      onClose={onClose}
      title="Mark Rejection as Resolved"
      subtitle={pc ? `Case ${pc.caseId} · ${fmtAmount(pc.amount)}` : ''}
      cancelText="Cancel"
      confirmText="Mark as Resolved"
      confirmVariant="filled"
      confirmLoading={loading}
      onConfirm={confirm}
    >
      {pc && (
        <div className="space-y-4">
          <div className="payment-detail-item">
            <div className="label">Record</div>
            <div className="value">{pc.accountHolderName || pc.beneficiaryId} · {pc.bankName || '—'} · {fmtAmount(pc.amount)}</div>
          </div>
          {rejectionReason && (
            <div className="text-xs bg-md-surface-container-low rounded-xl px-4 py-3 border border-md-outline/10">
              <span className="font-semibold text-md-on-surface">Rejection reason on record: </span>
              <span className="text-md-on-surface-variant">{formatReasonLabel(rejectionReason)}</span>
            </div>
          )}
          <div className="text-sm bg-md-primary/10 border border-md-primary/30 rounded-xl px-4 py-3 text-md-on-surface flex items-start gap-2">
            <BadgeCheck size={16} className="shrink-0 mt-0.5 text-md-primary" />
            <div>
              <div className="font-semibold text-md-on-surface">Marking this rejection as resolved means:</div>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>You have verified the rejection reason was addressed.</li>
                <li>The case returns to <strong>Pending Approval</strong>.</li>
                <li>The {pc.currentSignatures || 0} prior signature(s) stay valid — remaining approvals continue from there.</li>
              </ul>
            </div>
          </div>
          <CaseTimestamps pc={pc} />
        </div>
      )}
    </Modal>
  );
};

/* ------------------------------- Cancel Payment ------------------------------- */
/**
 * Two-step, high-accountability cancellation.
 *
 * Attempt 1 collects the statutory reason plus three deliberate confirmations —
 * retype the Payment ID, retype the Case ID, and tick an accountability
 * acknowledgement naming the GA. The destructive "Cancel Payment" button stays
 * disabled until every field is satisfied, and pressing it only opens Attempt 2.
 *
 * Attempt 2 is a final "Confirm Cancel Payment" gate. Only there does the call
 * fire. Cancelling is terminal: payment → Cancelled, statutory case → Case
 * Closed, and the only way forward is a brand-new case. Published blockchain
 * notarization is left untouched.
 */
export const CancelPaymentModal: React.FC<MutatingModalProps> = ({ pc, onClose, onDone }) => {
  const { identityId, identityLabel } = useAdminIdentity();
  const { loading, setLoading, notify } = useMutationState();
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [paymentIdInput, setPaymentIdInput] = useState('');
  const [caseIdInput, setCaseIdInput] = useState('');
  const [ackChecked, setAckChecked] = useState(false);

  const paymentId = pc?.paymentId || (pc ? `PMT-${pc.caseId}` : '');
  const reasonLabel = CANCELLATION_REASONS.find((r) => r.value === selectedReason)?.label || '';

  const allValid =
    Boolean(selectedReason) &&
    paymentIdInput.trim() === paymentId &&
    caseIdInput.trim() === (pc?.caseId || '') &&
    ackChecked;

  const resetForm = () => {
    setSelectedReason('');
    setPaymentIdInput('');
    setCaseIdInput('');
    setAckChecked(false);
    setShowConfirm(false);
  };

  const confirm = async () => {
    if (!pc || !allValid) return;
    setLoading(true);
    try {
      await paymentApi.cancelPayment({
        caseId: pc.caseId,
        adminId: identityId,
        reason: selectedReason,
      });
      notify({
        type: 'success',
        title: 'Payment Cancelled',
        message: `Case ${pc.caseId} cancelled and closed. Open a new case to restart the process.`,
      });
      resetForm();
      onClose();
      onDone();
    } catch (e: any) {
      notify({ type: 'error', title: 'Cancel failed', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  if (!pc) return null;

  return (
    <>
      {/* Attempt 1 of 2 — reason + deliberate confirmations */}
      <Modal
        isOpen={!showConfirm}
        onClose={onClose}
        title="Cancel Payment — Attempt 1 of 2"
        subtitle={`Case ${pc.caseId} · ${fmtAmount(pc.amount)}`}
        preventBackdropClose={true}
        maxWidth="max-w-lg"
        footer={
          <div className="flex items-center justify-between w-full gap-3">
            <Button
              variant="danger"
              size="md"
              disabled={!allValid}
              onClick={() => setShowConfirm(true)}
              title={allValid ? 'Proceed to final confirmation' : 'Complete every confirmation below to enable cancellation'}
            >
              <Ban size={15} />
              <span>Cancel Payment</span>
            </Button>
            <Button variant="filled" size="md" onClick={onClose}>
              <CheckCircle2 size={15} />
              <span>Keep Payment</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 text-sm bg-md-error/15 border-2 border-md-error/40 rounded-xl px-4 py-3 text-md-on-error-container">
            <AlertTriangle size={18} className="shrink-0 mt-0.5 text-md-error" />
            <span>
              <strong>Irreversible.</strong> Cancelling stops this disbursement permanently and closes the statutory case. The only way to continue is to open a new case and restart the whole process.
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
              wrapLabels
            />
          </div>

          <div className="pt-2 border-t border-md-outline/10 space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs text-md-on-surface-variant">
                Type Payment ID <strong className="font-mono text-md-on-surface">{paymentId}</strong> to confirm:
              </p>
              <Input
                label="Confirm Payment ID"
                value={paymentIdInput}
                onChange={(e) => setPaymentIdInput(e.target.value)}
                placeholder={paymentId}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-md-on-surface-variant">
                Type Case ID <strong className="font-mono text-md-on-surface">{pc.caseId}</strong> to confirm:
              </p>
              <Input
                label="Confirm Case ID"
                value={caseIdInput}
                onChange={(e) => setCaseIdInput(e.target.value)}
                placeholder={pc.caseId}
              />
            </div>
            <Checkbox
              id="cancel-accountability-ack"
              label={`I, ${identityLabel || 'the Government Administrator'}, accept full accountability for this cancellation. It is recorded against my identity and any resulting dispute will be traced to me.`}
              checked={ackChecked}
              onChange={(e) => setAckChecked(e.target.checked)}
            />
          </div>

          <div className="flex items-start gap-2 text-[11px] text-md-on-surface-variant bg-md-surface-container-low rounded-lg px-3 py-2 border border-md-outline/10">
            <ShieldAlert size={13} className="shrink-0 mt-0.5 text-md-warning-text" />
            <span>
              Cancellation only halts this payment instruction. The underlying statutory Form H award and any published blockchain notarization remain permanent and immutable.
            </span>
          </div>

          <CaseTimestamps pc={pc} />
        </div>
      </Modal>

      {/* Attempt 2 of 2 — final confirmation gate */}
      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirm Cancel Payment"
        subtitle={`Attempt 2 of 2 · Case ${pc.caseId}`}
        preventBackdropClose={true}
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="text" size="md" onClick={() => setShowConfirm(false)} disabled={loading}>
              Back
            </Button>
            <Button variant="danger" size="md" isLoading={loading} onClick={confirm}>
              <Ban size={15} />
              <span>Confirm Cancellation</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 text-sm bg-md-error/15 border-2 border-md-error/40 rounded-xl px-4 py-3 text-md-on-error-container">
            <ShieldAlert size={18} className="shrink-0 mt-0.5 text-md-error" />
            <span>
              <strong>Final confirmation.</strong> This closes the case for good. There is no undo and no re-approval — a new case must be opened to continue.
            </span>
          </div>

          <div className="bg-md-surface-container-low rounded-xl px-4 py-3 border border-md-outline/10 space-y-2 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-md-on-surface-variant">Case</span>
              <span className="font-mono font-semibold text-md-on-surface">{pc.caseId}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-md-on-surface-variant">Payment ID</span>
              <span className="font-mono font-semibold text-md-on-surface">{paymentId}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-md-on-surface-variant">Amount</span>
              <span className="font-bold text-md-primary">{fmtAmount(pc.amount)}</span>
            </div>
            <div className="pt-2 border-t border-md-outline/10">
              <div className="text-md-on-surface-variant mb-0.5">Reason</div>
              <div className="text-md-on-surface font-medium">{reasonLabel}</div>
            </div>
          </div>

          <ul className="text-xs text-md-on-surface-variant space-y-1 list-disc pl-5">
            <li>Payment status → <strong className="text-md-on-surface">Cancelled</strong></li>
            <li>Statutory case status → <strong className="text-md-on-surface">Case Closed</strong></li>
            <li>Blockchain notarization → <strong className="text-md-on-surface">stays published</strong></li>
          </ul>
        </div>
      </Modal>
    </>
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
            <span className="font-semibold">Latest error:</span> {lastError ? stripRawLogPrefix(lastError) : 'No error log available.'}
          </div>

          <CaseTimestamps pc={pc} />
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

          <CaseTimestamps pc={pc} />
        </div>
      )}
    </Modal>
  );
};

/* ------------------------------ Schedule Next Working Day ------------------------------ */

export const ScheduleTomorrowModal: React.FC<MutatingModalProps> = ({ pc, onClose, onDone }) => {
  const { loading, setLoading, notify } = useMutationState();

  const confirm = async () => {
    if (!pc) return;
    setLoading(true);
    try {
      await paymentApi.scheduleTomorrow(pc.caseId);
      notify({ type: 'success', title: 'Scheduled', message: `Case ${pc.caseId} scheduled for next working day (09:00 AM MYT).` });
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
      title="Schedule Next Working Day"
      subtitle={pc ? `Case ${pc.caseId} · ${fmtAmount(pc.amount)}` : ''}
      cancelText="Cancel"
      confirmText="Schedule Next Working Day"
      confirmLoading={loading}
      onConfirm={confirm}
    >
      {pc && (
        <div className="space-y-4">
          <div className="payment-detail-item">
            <div className="label">Record</div>
            <div className="value">{pc.accountHolderName || pc.beneficiaryId} · {fmtAmount(pc.amount)}</div>
          </div>
          <div className="p-3 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 rounded-lg text-sm text-sky-900 dark:text-sky-200">
            <div className="font-semibold mb-1">Execution Schedule</div>
            <div>{formatScheduledSubtitle(pc.scheduledFor)}</div>
          </div>
          <p className="text-sm text-md-on-surface-variant">
            Transfer will automatically execute on the next Malaysian bank working day (09:00 AM Asia/Kuala_Lumpur) and return to the Bank Portal approval queue.
          </p>

          <CaseTimestamps pc={pc} />
        </div>
      )}
    </Modal>
  );
};

export const ScheduleNextWorkingDayModal = ScheduleTomorrowModal;

/* -------------------------------- Mark Resolved -------------------------------- */

const DISPUTE_CONFIRM_LABELS: Record<string, string> = {
  MARK_AS_RESOLVED: 'Mark as Resolved',
  REINITIATE_PAYMENT: 'Reinitiate Payment',
  REQUEST_NEW_BANK_DETAILS: 'Request New Bank Details',
};

export const ResolveDisputeModal: React.FC<MutatingModalProps> = ({ pc, onClose, onDone }) => {
  const { identityId } = useAdminIdentity();
  const { loading, setLoading, notify } = useMutationState();
  const [resolution, setResolution] = useState('');

  const confirm = async () => {
    if (!pc || !resolution) return;
    setLoading(true);
    try {
      await paymentApi.resolveDispute({
        caseId: pc.caseId,
        adminId: identityId,
        resolution: resolution as 'MARK_AS_RESOLVED' | 'REINITIATE_PAYMENT' | 'REQUEST_NEW_BANK_DETAILS',
      });
      const messages: Record<string, { title: string; message: string }> = {
        MARK_AS_RESOLVED: {
          title: 'Dispute marked resolved',
          message: `Case ${pc.caseId} returned to Transfer Succeed — the member can confirm receipt or dispute again.`,
        },
        REINITIATE_PAYMENT: {
          title: 'Payment reinitiated',
          message: `Case ${pc.caseId} re-queued to the bank gateway for a fresh transfer attempt.`,
        },
        REQUEST_NEW_BANK_DETAILS: {
          title: 'New bank details requested',
          message: `Case ${pc.caseId} opened a fresh multi-sig cycle — the member must submit corrected bank details.`,
        },
      };
      notify({ type: 'success', ...messages[resolution] });
      onClose();
      onDone();
    } catch (e: any) {
      notify({ type: 'error', title: 'Dispute resolution failed', message: e.message || 'Could not resolve dispute.' });
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(pc)}
      onClose={onClose}
      title="Resolve Payment Dispute"
      subtitle={pc ? `Case ${pc.caseId} · ${fmtAmount(pc.amount)}` : ''}
      cancelText="Cancel"
      confirmText={resolution ? DISPUTE_CONFIRM_LABELS[resolution] ?? 'Confirm' : 'Confirm'}
      confirmLoading={loading}
      confirmDisabled={!resolution}
      onConfirm={confirm}
    >
      {pc && (
        <div className="space-y-4">
          <div className="payment-detail-item">
            <div className="label">Disputed record</div>
            <div className="value">{pc.accountHolderName || pc.beneficiaryId} · {fmtAmount(pc.amount)}</div>
          </div>
          <p className="text-sm text-md-on-surface-variant">
            Cross-check the transfer with the bank, then choose the verified outcome. The decision is recorded in the
            audit trail under <strong className="text-md-on-surface">{identityId}</strong>.
          </p>
          <Select
            label="Resolution (required)"
            value={resolution}
            onChange={setResolution}
            placeholder="Select resolution outcome"
            wrapLabels
            options={[
              {
                value: 'MARK_AS_RESOLVED',
                label: 'Mark as Resolved — bank and member documents confirm the funds settled; returns to Transfer Succeed so the member can confirm payment or dispute again',
              },
              {
                value: 'REINITIATE_PAYMENT',
                label: 'Reinitiate Payment — bank cross-check confirms the member never received the funds; re-queues the transfer to the bank gateway',
              },
              {
                value: 'REQUEST_NEW_BANK_DETAILS',
                label: 'Request New Bank Details — the transfer failed on bad recipient details; opens a fresh bank-details + multi-sig cycle',
              },
            ]}
          />
          {resolution === 'REINITIATE_PAYMENT' && (
            <div className="px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                Reinitiating re-sends the full {fmtAmount(pc.amount)} to the beneficiary account. Existing multi-sig
                approvals remain valid; no new signatures are required. The disputed cycle's receipt is archived.
              </span>
            </div>
          )}
          {resolution === 'REQUEST_NEW_BANK_DETAILS' && (
            <div className="px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                A new bank-details round voids all prior signatures — the multi-sig counter resets to 0 and the disputed
                cycle's receipt is archived.
              </span>
            </div>
          )}

          <CaseTimestamps pc={pc} />
        </div>
      )}
    </Modal>
  );
};

/* ------------------------------- Download & View Receipt ------------------------------- */

export const viewReceiptInNewTab = async (pc: PaymentRow, notify: (n: { type: 'success' | 'error'; title: string; message?: string }) => void) => {
  try {
    const blob = await paymentApi.downloadReceipt(pc.caseId);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } catch (e: any) {
    notify({ type: 'error', title: 'Receipt unavailable', message: e.message || 'Receipt preview failed. Missing bank reference. Please contact support.' });
  }
};

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

/**
 * Combined settlement summary — admin/audit only. Unlike an owner's 1-to-1
 * receipt it carries the case total, every co-owner's share, the RENTAS
 * reference and the settlement timestamp.
 */
export const downloadSettlementSummary = async (
  pc: PaymentRow,
  notify: (n: { type: 'success' | 'error'; title: string; message?: string }) => void
) => {
  try {
    const blob = await paymentApi.downloadSettlementSummary(pc.caseId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settlement-summary-${pc.caseId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify({
      type: 'success',
      title: 'Settlement summary downloaded',
      message: `Combined disbursement detail for case ${pc.caseId}.`,
    });
  } catch (e: any) {
    notify({
      type: 'error',
      title: 'Summary unavailable',
      message: e.message || 'Settlement summary generation failed. Please contact support.',
    });
  }
};
