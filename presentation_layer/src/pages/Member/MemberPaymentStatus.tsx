import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CircleDollarSign,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  CreditCard,
  ShieldCheck,
  Download,
  UploadCloud,
  ExternalLink,
  Landmark,
  Eye,
  FileText,
} from 'lucide-react';
import { paymentApi } from '../../services/paymentApi';
import { blockchainApi } from '../../services/blockchainApi';
import { normalizePaymentStatus, getMemberDisplayStatus, getMemberFailureNotice } from '../Payment/statusMaps';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useAuth } from '../../context/AuthContext';
import { ConfirmSubmitModal, ConfirmRow } from '../../components/member/ConfirmSubmitModal';
import { BankDetailsForm, formatLocalContactNumber } from './components/BankDetailsForm';
import { formatDateTime } from '../../utils/dateFormat';
import { CopyButton } from '../../components/ui/CopyButton';
import { formatCurrencyRM } from '../../utils/currency';

interface CaseOption {
  caseId: string;
  projectName: string;
  lotNo: string;
  amount: number;
  status: string;
}

interface PaymentCaseDetails {
  id: string;
  caseId: string;
  amount: number;
  status: string;
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  phoneNumber?: string;
  myKadNumber?: string;
  currentSignatures?: number;
  requiredSignatures?: number;
  authorisations?: Array<{ action?: string; reason?: string | null; adminId?: string; createdAt?: string }>;
  failedTransactions?: Array<{ errorLog?: string | null; resolution?: string | null; createdAt?: string }>;
  disputeDocumentPath?: string | null;
  disputeDocumentName?: string | null;
  disputeUploadedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export default function MemberPaymentStatus() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCaseId = searchParams.get('caseId');

  const [loadingCases, setLoadingCases] = useState<boolean>(true);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);
  const [availableCases, setAvailableCases] = useState<CaseOption[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(requestedCaseId || '');
  const [paymentCase, setPaymentCase] = useState<PaymentCaseDetails | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Full bank details modal state
  const [showBankDetailsModal, setShowBankDetailsModal] = useState<boolean>(false);

  // Dispute form state
  const [showDisputeModal, setShowDisputeModal] = useState<boolean>(false);
  const [disputeFile, setDisputeFile] = useState<File | null>(null);
  const [disputeRemark, setDisputeRemark] = useState<string>('');
  const [submittingDispute, setSubmittingDispute] = useState<boolean>(false);

  // FR-017 confirmation states
  const [showDisputeConfirm, setShowDisputeConfirm] = useState<boolean>(false);
  const [showReceiptConfirm, setShowReceiptConfirm] = useState<boolean>(false);
  const [confirmingReceipt, setConfirmingReceipt] = useState<boolean>(false);
  const bankFormRef = useRef<HTMLDivElement>(null);

  // 1. Discover Cases
  useEffect(() => {
    let isMounted = true;

    async function fetchCases() {
      setLoadingCases(true);
      try {
        const res = await paymentApi.getAllCases();
        const cases: any[] = res.cases || [];

        const cleanIc = (user?.identificationNumber || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const memberName = (user?.name || '').toLowerCase();
        const memberEmail = (user?.email || '').toLowerCase();

        const memberCases = cases.filter((c: any) => {
          if (c.accountHolderName && c.accountHolderName.toLowerCase() === memberName) return true;
          if (c.beneficiaryId === user?.userId) return true;
          if (c.myKadNumber && cleanIc && c.myKadNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanIc) return true;
          const owners = c.acquisitionCase?.landParcel?.ownerships?.map((o: any) => o.landOwner).filter(Boolean) || [];
          return owners.some((ow: any) => {
            const owIc = (ow.icNumber || ow.nric || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            return (
              (cleanIc && owIc === cleanIc) ||
              ow.ownerId === user?.userId ||
              (ow.name && ow.name.toLowerCase() === memberName) ||
              (ow.email && ow.email.toLowerCase() === memberEmail)
            );
          });
        });

        const mapped: CaseOption[] = memberCases.map((c: any) => ({
          caseId: c.caseId,
          projectName: c.acquisitionCase?.project?.projectName || `Acquisition Project ${c.caseId}`,
          lotNo: c.acquisitionCase?.landParcel?.lotNo || 'Lot Parcel',
          amount: Number(c.amount) || 0,
          status: c.status,
        }));

        if (isMounted) {
          setAvailableCases(mapped);
          if (mapped.length > 0) {
            const target = requestedCaseId
              ? mapped.find((item) => item.caseId.toLowerCase() === requestedCaseId.toLowerCase())
              : mapped[0];
            setSelectedCaseId(target ? target.caseId : mapped[0].caseId);
          } else {
            setSelectedCaseId('');
          }
        }
      } catch {
        if (isMounted) {
          setAvailableCases([]);
          setSelectedCaseId('');
        }
      } finally {
        if (isMounted) setLoadingCases(false);
      }
    }

    fetchCases();
    return () => {
      isMounted = false;
    };
  }, [requestedCaseId, user]);

  // 2. Fetch Detailed Status for Selected Case
  useEffect(() => {
    if (!selectedCaseId) return;
    let isMounted = true;

    async function fetchCaseStatus() {
      setLoadingStatus(true);
      try {
        const res = await paymentApi.getStatus(selectedCaseId);
        if (isMounted && res.paymentCase) {
          setPaymentCase(res.paymentCase);
        }
      } catch {
        if (isMounted) {
          // Fallback mock representation
          const fallback = availableCases.find((c) => c.caseId === selectedCaseId);
          setPaymentCase({
            id: `PMT-${selectedCaseId}`,
            caseId: selectedCaseId,
            amount: fallback ? fallback.amount : 3200000,
            status: fallback ? fallback.status : 'Offer Accepted',
            currentSignatures: 0,
            requiredSignatures: 2,
          });
        }
      } finally {
        if (isMounted) setLoadingStatus(false);
      }
    }

    fetchCaseStatus();
    return () => {
      isMounted = false;
    };
  }, [selectedCaseId, availableCases]);

  const activeCaseInfo = useMemo(() => {
    return availableCases.find((c) => c.caseId === selectedCaseId) || availableCases[0];
  }, [availableCases, selectedCaseId]);

  // Dual-milestone on-chain verification
  const [m1Record, setM1Record] = useState<any | null>(null);
  const [m2Record, setM2Record] = useState<any | null>(null);
  useEffect(() => {
    if (!selectedCaseId) {
      setM1Record(null);
      setM2Record(null);
      return;
    }
    let isMounted = true;
    blockchainApi
      .getRecords()
      .then((res: any) => {
        if (!isMounted) return;
        const list: any[] = res?.records || [];
        const mine = list.filter((r) => r.caseId === selectedCaseId);
        const isPublished = (s?: string | null) =>
          String(s || '').toUpperCase().replace(/[\s_]+/g, '_') === 'PUBLISHED';
        const m1 = mine.find((r) => (r.milestone ?? 'AWARD') === 'AWARD');
        const m2 = mine.find((r) => r.milestone === 'SETTLEMENT');
        setM1Record(m1 && isPublished(m1.status) ? m1 : null);
        setM2Record(m2 && isPublished(m2.status) ? m2 : null);
      })
      .catch(() => {
        if (isMounted) {
          setM1Record(null);
          setM2Record(null);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [selectedCaseId]);

  const rawStatus = paymentCase?.status || activeCaseInfo?.status || 'BANK_DETAILS_PENDING';
  const memberDisplay = getMemberDisplayStatus(rawStatus);
  const memberStatusLabel = memberDisplay.label;
  const memberBadgeClass = memberDisplay.badgeClass;

  // Plain-language reason for a failed or rejected transfer, so the member is
  // told what happened without having to ask support.
  const memberFailureNotice = getMemberFailureNotice(paymentCase);

  const isPaid = memberStatusLabel === 'Paid' || rawStatus === 'PAID';
  const isTransferSucceed = memberStatusLabel === 'Payment Completed' || rawStatus === 'TRANSFER_SUCCEED';
  const isPaymentInProgress = memberStatusLabel === 'Payment In Progress';
  const isDisputed = memberStatusLabel === 'Payment Disputed' || rawStatus === 'DISPUTED';

  // The dispute evidence the member filed is stored as the case's latest dispute
  // document plus a "DISPUTE: <remark>" failure log — surface both back to them.
  const hasDisputeStatement = Boolean(paymentCase?.disputeDocumentPath && paymentCase?.disputeDocumentName);
  const latestDisputeRemark = useMemo(() => {
    const latest = [...(paymentCase?.failedTransactions ?? [])]
      .reverse()
      .find((f) => typeof f.errorLog === 'string' && f.errorLog.startsWith('DISPUTE'));
    return latest?.errorLog?.replace(/^DISPUTE:\s*/, '') ?? '';
  }, [paymentCase]);

  const isBankPending =
    memberStatusLabel === 'Bank Details Pending' ||
    memberStatusLabel === 'New Bank Details Pending' ||
    memberStatusLabel === 'Bank Details & M1 Pending' ||
    rawStatus === 'BANK_DETAILS_PENDING' ||
    rawStatus === 'NEW_BANK_DETAILS_PENDING' ||
    rawStatus === 'BANK_DETAILS_AND_M1_PENDING' ||
    (!paymentCase?.bankName && !isPaid && !isTransferSucceed && !isPaymentInProgress);

  // Step 2 is completed ONLY when bank details have been submitted and verified
  const isBankVerified = !isBankPending && Boolean(paymentCase?.bankName && paymentCase?.accountNumber);

  const currentStep = useMemo(() => {
    if (isPaid) return 5;
    if (isTransferSucceed) return 4;
    if (isPaymentInProgress) return 3;
    if (isBankVerified) return 2;
    return 1; // Bank details pending -> Step 2 is active, requiring action
  }, [isPaid, isTransferSucceed, isPaymentInProgress, isBankVerified]);

  const etherscanUrlFor = (txHash?: string | null) =>
    txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : null;

  const handleCopyId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    notify({ type: 'general', title: 'Copied to clipboard', message: text });
    setTimeout(() => setCopiedId(false), 2000);
  };

  const refreshPaymentCase = async () => {
    if (!selectedCaseId) return;
    try {
      const res = await paymentApi.getStatus(selectedCaseId);
      if (res.paymentCase) setPaymentCase(res.paymentCase);
    } catch {}
  };

  const handleDownloadReceipt = async () => {
    if (!selectedCaseId) return;
    try {
      notify({ type: 'general', title: 'Preparing Receipt', message: 'Downloading official payment certificate...' });
      const blob = await paymentApi.downloadReceipt(selectedCaseId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FCR-Payment-Receipt-${selectedCaseId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      notify({ type: 'success', title: 'Download Complete', message: 'Payment receipt saved.' });
    } catch (err: any) {
      notify({
        type: 'error',
        title: 'Receipt Download Failed',
        message: err.message || 'Receipt unavailable until transfer execution is completed.',
      });
    }
  };

  const handleViewReceiptInNewTab = async () => {
    if (!selectedCaseId) return;
    try {
      notify({ type: 'general', title: 'Opening Receipt', message: 'Opening official payment certificate in new tab...' });
      const blob = await paymentApi.downloadReceipt(selectedCaseId);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err: any) {
      notify({
        type: 'error',
        title: 'Receipt Preview Failed',
        message: err.message || 'Receipt unavailable until transfer execution is completed.',
      });
    }
  };

  const handleViewDisputeStatementInNewTab = async () => {
    if (!selectedCaseId) return;
    try {
      const blob = await paymentApi.downloadDisputeStatement(selectedCaseId);
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      window.open(url, '_blank', 'noopener');
    } catch (err: any) {
      notify({
        type: 'error',
        title: 'Statement Preview Failed',
        message: err.message || 'Your submitted statement could not be opened.',
      });
    }
  };

  const handleDownloadDisputeStatement = async () => {
    if (!selectedCaseId) return;
    try {
      const blob = await paymentApi.downloadDisputeStatement(selectedCaseId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = paymentCase?.disputeDocumentName || `dispute-statement-${selectedCaseId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      notify({ type: 'success', title: 'Statement downloaded', message: 'Your submitted bank statement was saved.' });
    } catch (err: any) {
      notify({
        type: 'error',
        title: 'Download Failed',
        message: err.message || 'Your submitted statement could not be downloaded.',
      });
    }
  };

  const handleDisputeSubmitClick = () => {
    if (!disputeFile) {
      notify({ type: 'error', title: 'Missing Attachment', message: 'Please upload a real bank statement or transaction record (PDF).' });
      return;
    }
    if (!disputeRemark.trim()) {
      notify({ type: 'error', title: 'Missing Remark', message: 'Please add a remark describing the discrepancy for extra context.' });
      return;
    }
    setShowDisputeConfirm(true);
  };

  const handleDisputeSubmit = async () => {
    if (!disputeFile || !disputeRemark.trim()) return;
    setSubmittingDispute(true);
    try {
      await paymentApi.dispute(selectedCaseId, disputeFile, disputeRemark.trim());
      notify({
        type: 'success',
        title: 'Dispute Registered',
        message: 'Payment dispute submitted to Land Administration for review.',
      });
      setShowDisputeConfirm(false);
      setShowDisputeModal(false);
      setDisputeFile(null);
      setDisputeRemark('');
      await refreshPaymentCase();
    } catch (err: unknown) {
      const e = err as Error;
      notify({
        type: 'error',
        title: 'Dispute Submission Failed',
        message: e.message || 'Unable to register dispute.',
      });
    } finally {
      setSubmittingDispute(false);
    }
  };

  const handleConfirmReceipt = async () => {
    setConfirmingReceipt(true);
    try {
      await paymentApi.confirmReceipt({ caseId: selectedCaseId, role: 'DISPLACED_COMMUNITY_MEMBER' });
      notify({
        type: 'success',
        title: 'Receipt Confirmed',
        message: 'Thank you for confirming receipt of payment. Your case is now marked as Paid.',
      });
      setShowReceiptConfirm(false);
      await refreshPaymentCase();
    } catch (err: unknown) {
      const e = err as Error;
      notify({
        type: 'error',
        title: 'Confirmation Failed',
        message: e.message || 'Could not confirm receipt.',
      });
    } finally {
      setConfirmingReceipt(false);
    }
  };

  const scrollToBankForm = () => {
    bankFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // The five statutory stages. Notarization status deliberately does NOT live
  // here: each milestone is anchored separately and is reported once, in the
  // Blockchain anchors section below, so the same badge is not repeated per step.
  const steps = [
    {
      step: 1,
      title: 'Offer Accepted',
      subtitle: 'Statutory Form H award accepted by the landowner',
      completed: true,
    },
    {
      step: 2,
      title: 'Bank Details Verified',
      subtitle: isBankVerified
        ? `${paymentCase?.bankName} (•••• ${paymentCase?.accountNumber?.slice(-4)}) on record`
        : isBankPending
        ? 'Awaiting your bank details submission'
        : 'Bank details submission verified',
      completed: isBankVerified,
      isCurrent: isBankPending,
      actionRequired: isBankPending,
    },
    {
      step: 3,
      title: 'Multi-Signature Governance',
      subtitle: isBankPending
        ? 'Government Administrator approval'
        : paymentCase?.requiredSignatures
        ? `${paymentCase.currentSignatures || 0} of ${paymentCase.requiredSignatures} administrative signatures`
        : 'Government Administrator approval',
      completed: currentStep >= 4 || isTransferSucceed || isPaid,
    },
    {
      step: 4,
      title: 'RENTAS Clearing House',
      subtitle: 'Interbank settlement cleared by Bank Negara Malaysia',
      completed: currentStep >= 5 || isPaid,
    },
    {
      step: 5,
      title: 'Disbursement Confirmed',
      subtitle: 'Funds confirmed received by the beneficiary',
      completed: isPaid,
    },
  ];

  /**
   * Unified Component: Combines the 5-Stage Disbursement Progress Workflow
   * and the Dual-Milestone Cryptographic Blockchain Proofs into a single cohesive card.
   */
  const renderUnifiedLifecycleAndAuditCard = () => (
    <div className="bg-md-surface-container border border-md-outline/15 rounded-xl p-5 sm:p-7 shadow-sm">
      {/* Card header — the ledger is named once, here, rather than on every row. */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-md-outline/10">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-md-primary/10 border border-md-primary/20 flex items-center justify-center text-md-primary shrink-0">
            <ShieldCheck size={22} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-md-on-surface">
              Disbursement Lifecycle
            </h3>
            <p className="text-xs text-md-on-surface-variant mt-1 leading-relaxed">
              Five statutory stages, with the award and the settlement each anchored on the
              Ethereum Sepolia ledger.
            </p>
          </div>
        </div>

        <Link
          to="/member/verify-audit"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-md-primary hover:underline shrink-0 focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:outline-none rounded self-start sm:self-center"
          aria-label="Verify a document against the blockchain audit trail"
        >
          <span>Verify a document</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {/* Progress — generous rhythm so five stages read as a sequence, not a wall. */}
      <div className="py-7">
        <div className="space-y-7 sm:space-y-0 sm:grid sm:grid-cols-5 sm:gap-4">
          {steps.map((s, idx) => {
            const isDone = s.completed;
            const isCurrent = !isDone && (idx === 0 || steps[idx - 1].completed);

            return (
              <div
                key={s.step}
                className="flex sm:flex-col items-start sm:items-center gap-4 sm:gap-3 relative text-left sm:text-center"
              >
                {/* Desktop connector, pinned to the centre of the 44px circle. */}
                {idx < steps.length - 1 && (
                  <div
                    className={`hidden sm:block absolute top-[21px] left-1/2 w-full h-px -z-0 ${
                      steps[idx + 1].completed
                        ? 'bg-emerald-500'
                        : isDone
                        ? 'bg-md-primary/40'
                        : 'bg-md-outline/20'
                    }`}
                  />
                )}

                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-200 z-10 ${
                    isDone
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isCurrent
                      ? 'bg-md-primary text-white ring-4 ring-md-primary/20 animate-pulse'
                      : 'bg-md-surface-container-low text-md-on-surface-variant border border-md-outline/30'
                  }`}
                >
                  {isDone ? <CheckCircle2 size={20} /> : s.step}
                </div>

                <div className="min-w-0 flex-1 sm:pt-1">
                  <span
                    className={`text-[13px] font-bold block ${
                      isDone
                        ? 'text-emerald-700'
                        : isCurrent
                        ? 'text-md-primary'
                        : 'text-md-on-surface-variant'
                    }`}
                  >
                    {s.title}
                  </span>
                  <span className="text-xs text-md-on-surface-variant leading-relaxed block mt-1.5">
                    {s.subtitle}
                  </span>

                  {s.actionRequired && (
                    <button
                      type="button"
                      onClick={scrollToBankForm}
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 underline mt-2 cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      <span>Submit details now</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Anchors — the one place notarization status is reported. */}
      <div className="pt-6 border-t border-md-outline/10">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-5">
          <h4 className="text-sm font-bold text-md-on-surface">
            Blockchain anchors
          </h4>
          <p className="text-xs text-md-on-surface-variant">
            One immutable record for the award, one for the settlement
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Milestone 1 */}
          <div className="p-5 rounded-xl bg-md-surface-container-low border border-md-outline/15">
            <div className="flex items-center justify-between gap-3 mb-4">
              <span className="text-xs font-semibold text-md-on-surface-variant">
                Milestone 1 · Statutory award
              </span>
              {m1Record ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  <span>Notarised</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
                  <AlertTriangle size={13} aria-hidden="true" />
                  <span>Pending</span>
                </span>
              )}
            </div>

            <h5 className="text-sm font-bold text-md-on-surface">
              Form H award acceptance
            </h5>
            <p className="text-xs text-md-on-surface-variant leading-relaxed mt-1.5">
              The compensation entitlement, recorded permanently on-chain.
            </p>

            {m1Record ? (
              <dl className="mt-5 space-y-3 text-xs">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-md-on-surface-variant shrink-0">Ledger key</dt>
                  <dd className="font-mono font-semibold text-md-on-surface text-right break-all">
                    {m1Record.onChainKey || `${selectedCaseId}#M1`}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-md-on-surface-variant shrink-0">Transaction</dt>
                  <dd className="flex items-center gap-1.5 min-w-0">
                    <a
                      href={`https://sepolia.etherscan.io/tx/${m1Record.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-semibold text-md-primary hover:underline inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-md-primary rounded"
                      title="View this transaction on Etherscan Sepolia"
                    >
                      <span>{m1Record.transactionHash.slice(0, 8)}…{m1Record.transactionHash.slice(-6)}</span>
                      <ExternalLink size={11} aria-hidden="true" />
                    </a>
                    <CopyButton value={m1Record.transactionHash} size="sm" title="Copy transaction hash" />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-md-on-surface-variant shrink-0">Form H SHA-256</dt>
                  <dd className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-md-on-surface truncate max-w-[150px] sm:max-w-[190px]">
                      {m1Record.documentHash}
                    </span>
                    <CopyButton value={m1Record.documentHash} size="sm" title="Copy Form H hash" />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 pt-3 border-t border-md-outline/10">
                  <dt className="text-md-on-surface-variant shrink-0">Notarised</dt>
                  <dd className="font-medium text-md-on-surface text-right">
                    {formatDateTime(m1Record.publishedAt ?? m1Record.createdAt)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-5 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-3 leading-relaxed">
                Awaiting publication after the statutory review window.
              </p>
            )}
          </div>

          {/* Milestone 2 */}
          <div className="p-5 rounded-xl bg-md-surface-container-low border border-md-outline/15">
            <div className="flex items-center justify-between gap-3 mb-4">
              <span className="text-xs font-semibold text-md-on-surface-variant">
                Milestone 2 · Settlement
              </span>
              {m2Record ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  <span>Notarised</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
                  <AlertTriangle size={13} aria-hidden="true" />
                  <span>Pending</span>
                </span>
              )}
            </div>

            <h5 className="text-sm font-bold text-md-on-surface">
              Official payment receipt
            </h5>
            <p className="text-xs text-md-on-surface-variant leading-relaxed mt-1.5">
              The RENTAS RTGS settlement receipt, anchored on-chain.
            </p>

            {m2Record ? (
              <dl className="mt-5 space-y-3 text-xs">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-md-on-surface-variant shrink-0">Ledger key</dt>
                  <dd className="font-mono font-semibold text-md-on-surface text-right break-all">
                    {m2Record.onChainKey || `${selectedCaseId}#M2`}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-md-on-surface-variant shrink-0">Transaction</dt>
                  <dd className="flex items-center gap-1.5 min-w-0">
                    <a
                      href={`https://sepolia.etherscan.io/tx/${m2Record.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-semibold text-md-primary hover:underline inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-md-primary rounded"
                      title="View this transaction on Etherscan Sepolia"
                    >
                      <span>{m2Record.transactionHash.slice(0, 8)}…{m2Record.transactionHash.slice(-6)}</span>
                      <ExternalLink size={11} aria-hidden="true" />
                    </a>
                    <CopyButton value={m2Record.transactionHash} size="sm" title="Copy transaction hash" />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-md-on-surface-variant shrink-0">Receipt SHA-256</dt>
                  <dd className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-md-on-surface truncate max-w-[150px] sm:max-w-[190px]">
                      {m2Record.documentHash}
                    </span>
                    <CopyButton value={m2Record.documentHash} size="sm" title="Copy receipt hash" />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 pt-3 border-t border-md-outline/10">
                  <dt className="text-md-on-surface-variant shrink-0">Notarised</dt>
                  <dd className="font-medium text-md-on-surface text-right">
                    {formatDateTime(m2Record.publishedAt ?? m2Record.createdAt)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-5 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-3 leading-relaxed">
                Awaiting notarisation after the interbank settlement.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto pt-6 sm:pt-8 pb-12 px-4 sm:px-6 space-y-6">
      {/* Page Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-md-outline/15">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-md-primary/10 text-md-primary">
              Real-Time Audit Tracker
            </span>
            <span className="text-xs text-md-on-surface-variant">LAA 1960 Digital Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-md-on-surface">
            Compensation Payment Status
          </h1>
          <p className="text-xs sm:text-sm text-md-on-surface-variant mt-0.5">
            Track multi-signature governance, clearing house clearance, and fund disbursement.
          </p>
        </div>

        <Link
          to="/member"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-md-primary hover:underline self-start sm:self-center"
        >
          <ArrowLeft size={14} />
          <span>Return to Dashboard</span>
        </Link>
      </div>

      {/* Case Switcher Dropdown */}
      {availableCases.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-end gap-2">
          <div className="sm:w-[440px]">
            <Select
              label="Select Case"
              placeholder={loadingCases ? 'Loading your cases…' : 'Select a case…'}
              options={availableCases.map((c) => ({
                value: c.caseId,
                label: `${c.caseId} — ${c.projectName} · ${c.lotNo} · ${formatCurrencyRM(c.amount)} [${getMemberDisplayStatus(c.status).label}]`,
              }))}
              value={selectedCaseId}
              onChange={(val) => {
                setSelectedCaseId(val);
                setSearchParams({ caseId: val });
              }}
              wrapLabels
              disabled={loadingCases}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loadingCases && availableCases.length === 0 && (
        <div className="bg-md-surface-container border border-md-outline/15 rounded-xl p-8 text-center space-y-3 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <CircleDollarSign size={28} />
          </div>
          <h2 className="text-base font-bold text-md-on-surface">No Payment Records Under Your Account</h2>
          <p className="text-xs text-md-on-surface-variant max-w-sm mx-auto">
            There are currently no statutory compensation payment records issued under your account ({user?.name || user?.email}). Cases progress to payment status once an official Form H award notice has been accepted.
          </p>
        </div>
      )}

      {availableCases.length > 0 && (
        <>
          {/* =========================================================================
              HIERARCHY FLOW 1: BANK DETAILS PENDING (PRIORITY 1: SUBMIT DETAILS NOW)
              When the member needs to provide bank details, this is their PRIMARY purpose.
              The form is presented front and center at the very top of the page!
             ========================================================================= */}
          {isBankPending && (
            <>
              {/* Compact Case Context Banner */}
              <div className="bg-md-surface-container border border-md-outline/15 rounded-xl p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-md-outline/10">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-base sm:text-lg font-bold text-md-primary">
                        {selectedCaseId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyId(selectedCaseId)}
                        title="Copy Case ID"
                        className="text-md-on-surface-variant hover:text-md-primary transition p-1"
                      >
                        {copiedId ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                      <span className={`payment-badge ${memberBadgeClass}`}>
                        <span className="dot" />
                        {memberStatusLabel}
                      </span>
                    </div>
                    <h2 className="text-sm sm:text-base font-semibold text-md-on-surface mt-1">
                      {activeCaseInfo?.projectName}
                    </h2>
                    <p className="text-xs text-md-on-surface-variant">
                      {activeCaseInfo?.lotNo} · Statutory Land Acquisition
                    </p>
                  </div>

                  <div className="sm:text-right bg-md-surface-container-low sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-md-on-surface-variant block">
                      Total Statutory Award
                    </span>
                    <span className="text-lg sm:text-2xl font-extrabold text-md-primary">
                      {formatCurrencyRM(paymentCase?.amount || activeCaseInfo?.amount || 0)}
                    </span>
                    <span className="text-[11px] text-md-on-surface-variant block mt-0.5">
                      Form H Legal Entitlement
                    </span>
                  </div>
                </div>

                {/* Priority Guidance Alert */}
                <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <CreditCard size={20} className="text-amber-800 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900">
                    <h3 className="font-bold text-xs sm:text-sm">
                      {rawStatus && normalizePaymentStatus(rawStatus) === 'New Bank Details Pending'
                        ? 'Action Required: Submit Updated Beneficiary Bank Details'
                        : 'Action Required: Submit Beneficiary Bank Details'}
                    </h3>
                    <p className="mt-0.5 text-amber-800 leading-relaxed">
                      Government Administrators cannot initiate statutory compensation disbursement until your bank account details are registered. Please complete your bank details submission below.
                    </p>
                  </div>
                </div>
              </div>

              {/* ★ PRIMARY HERO: Inline Bank Details Submission Form (Immediate, No Scrolling Required) */}
              {selectedCaseId && (
                <div ref={bankFormRef} id="bank-submission-form" className="scroll-mt-24">
                  <BankDetailsForm
                    caseId={selectedCaseId}
                    caseInfo={{
                      projectName: activeCaseInfo?.projectName,
                      lotNo: activeCaseInfo?.lotNo,
                      amount: paymentCase?.amount || activeCaseInfo?.amount,
                    }}
                    onSubmitted={refreshPaymentCase}
                  />
                </div>
              )}

              {/* SECONDARY CONTEXT: Unified Disbursement Progress & Cryptographic Audit Trail */}
              {renderUnifiedLifecycleAndAuditCard()}
            </>
          )}

          {/* =========================================================================
              HIERARCHY FLOW 2: BANK DETAILS VERIFIED (PRIORITY 1: VIEW DISBURSEMENT STATUS)
              When bank details are already verified, the member's purpose is tracking
              operational progress, multi-sig approvals, and verifying on-chain records.
             ========================================================================= */}
          {!isBankPending && (
            <>
              {/* Transfer Failed / Transfer Rejected — plain-language reason and
                  the single next step, with no raw bank or governance codes. */}
              {memberFailureNotice && (
                <div
                  className={`p-5 sm:p-6 rounded-2xl border-2 shadow-sm space-y-3 ${
                    memberFailureNotice.category === 'rejected'
                      ? 'bg-amber-50 border-amber-300'
                      : 'bg-rose-50 border-rose-300'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-full text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 ${
                        memberFailureNotice.category === 'rejected' ? 'bg-amber-600' : 'bg-rose-600'
                      }`}
                    >
                      <AlertTriangle size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-md-on-surface">
                        {memberFailureNotice.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-md-on-surface-variant mt-1 leading-relaxed">
                        {memberFailureNotice.reason}
                      </p>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/70 border border-md-outline/15 text-xs text-md-on-surface leading-relaxed">
                    <span className="font-semibold">What happens next: </span>
                    {memberFailureNotice.nextStep}
                  </div>
                </div>
              )}

              {/* Dispute record — after contesting a transfer the member needs to see
                  exactly what they filed (remark + statement) and re-open the evidence,
                  mirroring the receipt group on the Transfer Succeed banner. */}
              {isDisputed && (
                <div className="p-5 sm:p-6 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-sm space-y-4">
                  <div className="flex items-start gap-3.5 pb-3.5 border-b border-amber-200">
                    <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <AlertTriangle size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-bold text-amber-950">
                          Payment Disputed
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-200 text-amber-900 border border-amber-300">
                          Under Review
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed">
                        You reported that this payment has not reached your account. A Government
                        Administrator is cross-checking the transfer with the bank.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-bold text-amber-950">What you submitted</div>

                    {latestDisputeRemark && (
                      <div className="rounded-xl bg-white/70 border border-amber-200 px-3.5 py-3">
                        <div className="text-[11px] font-semibold text-amber-800/80 mb-0.5">
                          Your remark
                        </div>
                        <p className="text-xs text-md-on-surface leading-relaxed break-words">
                          {latestDisputeRemark}
                        </p>
                      </div>
                    )}

                    {hasDisputeStatement && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-white/70 border border-amber-200 px-3.5 py-3">
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-amber-800/80 mb-0.5">
                            Supporting statement
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <FileText size={14} className="text-amber-700 shrink-0" />
                            <span className="text-xs font-semibold text-md-on-surface truncate">
                              {paymentCase?.disputeDocumentName}
                            </span>
                          </div>
                          {paymentCase?.disputeUploadedAt && (
                            <div className="text-[11px] text-md-on-surface-variant mt-0.5">
                              Uploaded {formatDateTime(paymentCase.disputeUploadedAt)}
                            </div>
                          )}
                        </div>
                        <div className="inline-flex self-start rounded-xl overflow-hidden border border-amber-300 bg-white shadow-2xs shrink-0">
                          <button
                            type="button"
                            onClick={handleViewDisputeStatementInNewTab}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100/70 transition-colors cursor-pointer border-r border-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-600"
                            title="Open your submitted bank statement in a new tab"
                          >
                            <Eye size={14} className="text-amber-700" />
                            <span>View statement</span>
                            <ExternalLink size={11} className="text-amber-600/70" />
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadDisputeStatement}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-600"
                            title="Download your submitted bank statement"
                          >
                            <Download size={14} className="text-amber-700" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-amber-200 text-xs text-amber-900 leading-relaxed">
                    <span className="font-semibold">What happens next: </span>
                    The recorded transfer is cross-checked against your statement. You will be notified
                    once the dispute is resolved — no action is needed from you right now.
                  </div>
                </div>
              )}

              {/* Transfer Succeed Confirmation & Receipt Banner */}
              {isTransferSucceed && (
                <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-300 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-emerald-200">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                        <CheckCircle2 size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-bold text-emerald-950">
                            Payment Completed &amp; Disbursed
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-200 text-emerald-900 border border-emerald-300">
                            Funds Released
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-emerald-800 mt-1 leading-relaxed">
                          Payment has been disbursed by the bank to your registered account via RENTAS RTGS.
                          You can review your official receipt and confirm fund acknowledgment below.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Receipt is evidence, not a decision: view and download share one
                      segmented control so they read as a single artifact, kept quiet
                      above the decision instead of competing with it as equal buttons. */}
                  <div className="inline-flex self-start rounded-xl overflow-hidden border border-emerald-300 bg-white shadow-2xs">
                    <button
                      type="button"
                      onClick={handleViewReceiptInNewTab}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-100/70 transition-colors cursor-pointer border-r border-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600"
                      title="View official statutory receipt in a new tab"
                    >
                      <Eye size={14} className="text-emerald-700" />
                      <span>View receipt</span>
                      <ExternalLink size={11} className="text-emerald-600/70" />
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadReceipt}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-100/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600"
                      title="Download official statutory payment voucher PDF"
                    >
                      <Download size={14} className="text-emerald-700" />
                      <span>Download receipt</span>
                    </button>
                  </div>

                  {/* The one decision the member has to make. Confirm is the primary
                      path and takes the size; disputing is the exception, so it sits
                      beside it as a dimmed secondary — still legible, clearly not the
                      default, and never styled to look destructive-by-accident. */}
                  <div className="pt-4 border-t border-emerald-200 space-y-3">
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950">
                        Have you received this payment?
                      </h4>
                      <p className="text-xs text-emerald-800/80 mt-0.5 leading-relaxed">
                        Confirming closes your case as Paid. If the funds have not arrived, tell us
                        before the 7-day window ends.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                      <Button
                        variant="filled"
                        size="lg"
                        className="!bg-emerald-600 !text-white hover:!bg-emerald-700 font-bold shadow-md w-full sm:w-auto"
                        onClick={() => setShowReceiptConfirm(true)}
                      >
                        <CheckCircle2 size={18} />
                        <span>Confirm Payment Received</span>
                      </Button>
                      <Button
                        variant="text"
                        size="md"
                        className="!text-xs !font-semibold !text-rose-600 hover:!bg-rose-50 w-full sm:w-auto"
                        onClick={() => setShowDisputeModal(true)}
                        title="Open a dispute if the funds have not reached your account"
                      >
                        <AlertTriangle size={14} />
                        <span>Payment not received</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Case & Registered Bank Account Summary Card */}
              <div className="bg-md-surface-container border border-md-outline/15 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-md-outline/10">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-base sm:text-lg font-bold text-md-primary">
                        {selectedCaseId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyId(selectedCaseId)}
                        title="Copy Case ID"
                        className="text-md-on-surface-variant hover:text-md-primary transition p-1"
                      >
                        {copiedId ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                      <span className={`payment-badge ${memberBadgeClass}`}>
                        <span className="dot" />
                        {memberStatusLabel}
                      </span>
                    </div>
                    <h2 className="text-sm sm:text-base font-semibold text-md-on-surface mt-1">
                      {activeCaseInfo?.projectName}
                    </h2>
                    <p className="text-xs text-md-on-surface-variant">
                      {activeCaseInfo?.lotNo} · Statutory Land Acquisition
                    </p>
                  </div>

                  <div className="sm:text-right bg-md-surface-container-low sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-md-on-surface-variant block">
                      Total Statutory Award
                    </span>
                    <span className="text-lg sm:text-2xl font-extrabold text-md-primary">
                      {formatCurrencyRM(paymentCase?.amount || activeCaseInfo?.amount || 0)}
                    </span>
                    <span className="text-[11px] text-md-on-surface-variant block mt-0.5">
                      Form H Legal Entitlement
                    </span>
                  </div>
                </div>

                {/* Key Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-md-on-surface-variant block">Payment ID</span>
                    <span className="font-mono font-semibold text-md-on-surface">
                      {paymentCase?.id || `PMT-${selectedCaseId}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-md-on-surface-variant block">Beneficiary Bank</span>
                    <span className="font-semibold text-md-on-surface truncate block">
                      {paymentCase?.bankName || 'Registered'}
                    </span>
                  </div>
                  <div>
                    <span className="text-md-on-surface-variant block">Account Number</span>
                    <span className="font-mono font-semibold text-md-on-surface">
                      {paymentCase?.accountNumber ? `•••• ${paymentCase.accountNumber.slice(-4)}` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-md-on-surface-variant block">Clearing Channel</span>
                    <span className="font-semibold text-emerald-700 block truncate" title="RENTAS Real-Time Gross Settlement">
                      RENTAS RTGS
                    </span>
                  </div>
                  <div>
                    <span className="text-md-on-surface-variant block">Multi-Sig Status</span>
                    <span className="font-semibold text-md-on-surface">
                      {paymentCase?.requiredSignatures
                        ? `${paymentCase.currentSignatures || 0} of ${paymentCase.requiredSignatures} Sigs`
                        : isPaid ? 'Fully Approved' : 'In Governance'}
                    </span>
                  </div>
                </div>

                {/* The receipt is the artifact and the bank details are a lookup, so
                    they get different weight: view and download share one segmented
                    control, and the details lookup is a quiet text affordance rather
                    than a third pill competing with them. */}
                {isBankVerified && (
                  <div className="pt-3 border-t border-md-outline/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <span className="text-md-on-surface-variant flex items-center gap-1.5 min-w-0">
                      <CreditCard size={14} className="text-md-primary shrink-0" />
                      <span className="truncate">
                        Registered Account: <strong>{paymentCase?.bankName}</strong> (•••• {paymentCase?.accountNumber?.slice(-4)})
                      </span>
                    </span>
                    <div className="flex items-center gap-3 flex-wrap shrink-0">
                      {isPaid && (
                        <div className="inline-flex rounded-xl overflow-hidden border border-md-outline/40 bg-md-surface-container-low shadow-2xs">
                          <button
                            type="button"
                            onClick={handleViewReceiptInNewTab}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-md-on-surface hover:bg-md-primary/8 transition-colors cursor-pointer border-r border-md-outline/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-md-primary"
                            title="Open the official statutory receipt in a new tab"
                          >
                            <Eye size={13} className="text-md-primary" />
                            <span>View receipt</span>
                            <ExternalLink size={10} className="text-md-on-surface-variant" />
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadReceipt}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-md-on-surface hover:bg-md-primary/8 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-md-primary"
                            title="Download the official statutory payment voucher as PDF"
                          >
                            <Download size={13} className="text-md-primary" />
                            <span>Download</span>
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowBankDetailsModal(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-md-primary hover:underline underline-offset-2 cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-1"
                      >
                        <span>View full bank details</span>
                        <ArrowRight size={13} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ★ PRIMARY HERO: Unified Disbursement Lifecycle & Blockchain Audit Trail */}
              {renderUnifiedLifecycleAndAuditCard()}
            </>
          )}
        </>
      )}

      {/* =========================================================================
          MODALS
         ========================================================================= */}

      {/* 1. View Full Submitted Bank Details Modal */}
      <Modal
        isOpen={showBankDetailsModal}
        onClose={() => setShowBankDetailsModal(false)}
        title="Registered Beneficiary Bank Details"
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center justify-end w-full">
            <Button
              variant="tonal"
              onClick={() => setShowBankDetailsModal(false)}
            >
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900">
              <p className="font-bold">Verified Statutory Payout Account</p>
              <p className="mt-0.5 text-emerald-800 leading-relaxed">
                This account is officially recorded to receive statutory compensation for Case{' '}
                <span className="font-mono font-semibold">{selectedCaseId}</span>.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs bg-md-surface-container-low p-4 rounded-xl border border-md-outline/15">
            <div className="flex justify-between items-center pb-2 border-b border-md-outline/10">
              <span className="text-md-on-surface-variant font-medium">Bank Institution</span>
              <span className="font-semibold text-md-on-surface flex items-center gap-1.5">
                <Landmark size={14} className="text-md-primary" />
                <span>{paymentCase?.bankName || '—'}</span>
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-md-outline/10">
              <span className="text-md-on-surface-variant font-medium">Bank Account Number</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm font-bold text-md-primary">
                  {paymentCase?.accountNumber || '—'}
                </span>
                {paymentCase?.accountNumber && (
                  <CopyButton value={paymentCase.accountNumber} size="sm" title="Copy Account Number" />
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-md-outline/10">
              <span className="text-md-on-surface-variant font-medium">Account Holder Name</span>
              <span className="font-semibold text-md-on-surface">
                {paymentCase?.accountHolderName || user?.name || '—'}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-md-outline/10">
              <span className="text-md-on-surface-variant font-medium">MyKad / Identification</span>
              <span className="font-mono font-semibold text-md-on-surface">
                {paymentCase?.myKadNumber || user?.identificationNumber || '—'}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-md-outline/10">
              <span className="text-md-on-surface-variant font-medium">Contact Mobile</span>
              <span className="font-mono font-semibold text-md-on-surface">
                {formatLocalContactNumber(paymentCase?.phoneNumber || user?.contactNumber) || '—'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-md-on-surface-variant font-medium">Clearing System</span>
              <span className="font-semibold text-emerald-700">
                RENTAS RTGS (Bank Negara Malaysia)
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-md-surface-container border border-md-outline/15 text-[11px] text-md-on-surface-variant leading-relaxed">
            <span className="font-semibold text-md-on-surface">Statutory Protection Notice: </span>
            Account details are locked during active multi-signature governance to guarantee funds reach the verified title landowner without diversion.
          </div>
        </div>
      </Modal>

      {/* 2. Dispute Modal */}
      <Modal
        isOpen={showDisputeModal}
        onClose={submittingDispute ? () => {} : () => {
          setShowDisputeModal(false);
          setDisputeFile(null);
          setDisputeRemark('');
        }}
        title="Lodge Payment Inquiry / Dispute"
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="text"
              onClick={() => {
                setShowDisputeModal(false);
                setDisputeFile(null);
                setDisputeRemark('');
              }}
              disabled={submittingDispute}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDisputeSubmitClick}
              disabled={submittingDispute || !disputeFile || !disputeRemark.trim()}
              title={!disputeFile ? 'A bank statement PDF is required' : !disputeRemark.trim() ? 'A remark is required' : undefined}
            >
              Review &amp; Submit Dispute
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-md-on-surface-variant leading-relaxed">
            If you have not received your statutory disbursement after clearance or contest the compensation amount for Case{' '}
            <span className="font-bold text-md-on-surface">{selectedCaseId}</span>, attach a real bank
            statement or transaction record (PDF) and add a remark to register an official inquiry.
          </p>

          <div className="border-2 border-dashed border-md-outline/30 rounded-xl p-6 text-center hover:bg-md-surface-container-low transition cursor-pointer">
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => {
                if (e.target.files?.[0]) setDisputeFile(e.target.files[0]);
              }}
              className="hidden"
              id="dispute-file-input"
            />
            <label htmlFor="dispute-file-input" className="cursor-pointer flex flex-col items-center">
              <UploadCloud size={32} className="text-md-primary mb-2" />
              <span className="text-xs font-semibold text-md-on-surface">
                {disputeFile ? disputeFile.name : 'Bank statement / transaction record (PDF) — required'}
              </span>
              <span className="text-[10px] text-md-on-surface-variant mt-1">
                PDF only · Maximum file size: 10MB
              </span>
            </label>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="dispute-remark" className="text-xs font-bold text-md-on-surface block">
              Remark <span className="text-red-600">*</span>
            </label>
            <textarea
              id="dispute-remark"
              value={disputeRemark}
              onChange={(e) => setDisputeRemark(e.target.value)}
              placeholder="Describe the discrepancy, delayed clearance, or amount difference for extra context..."
              rows={3}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-md-outline/40 bg-md-surface-container-low text-xs text-md-on-surface placeholder:text-md-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-md-primary/40 resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* 3. Confirm Dispute Dialog */}
      <ConfirmSubmitModal
        isOpen={showDisputeConfirm}
        title="Confirm Official Dispute"
        loading={submittingDispute}
        confirmLabel="Submit Official Dispute"
        onConfirm={handleDisputeSubmit}
        onCancel={() => setShowDisputeConfirm(false)}
        summary={
          <>
            <ConfirmRow label="Case" value={selectedCaseId} mono />
            <ConfirmRow label="Attachment" value={disputeFile?.name || '—'} />
            <ConfirmRow label="Remark" value={disputeRemark.trim()} />
          </>
        }
      />

      {/* 4. Confirm Receipt Dialog */}
      <ConfirmSubmitModal
        isOpen={showReceiptConfirm}
        title="Confirm Payment Received"
        loading={confirmingReceipt}
        confirmLabel="Yes, I Received the Payment"
        onConfirm={handleConfirmReceipt}
        onCancel={() => setShowReceiptConfirm(false)}
        summary={
          <>
            <ConfirmRow label="Case" value={selectedCaseId} mono />
            <ConfirmRow
              label="Amount"
              value={formatCurrencyRM(paymentCase?.amount || activeCaseInfo?.amount || 0)}
            />
            <ConfirmRow
              label="Effect"
              value="Case is marked as Paid. This closes the confirmation window — disputes are no longer possible."
            />
          </>
        }
      />
    </div>
  );
}
