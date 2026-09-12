import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  Lock,
  ChevronDown,
  ChevronUp,
  Calendar,
  Eye,
  CheckCircle2,
  ExternalLink,
  CreditCard,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Download,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { WorkflowStep } from '../hooks/useMemberWorkflow';
import { paymentApi } from '../../../services/paymentApi';
import { getMemberDisplayStatus } from '../../Payment/statusMaps';
import { formatCurrencyRM } from '../../../utils/currency';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Textarea } from '../../../components/ui/Textarea';

export function getEffectiveRequiredSigs(amount: number, setReq?: number): number {
  if (setReq && setReq > 0) return setReq;
  if (!amount || amount <= 0) return 2;
  const num = Number(amount);
  const base = 2;
  const extra = num >= 1_000_000 ? 1 + Math.floor((num - 1_000_000) / 5_000_000) : 0;
  return Math.min(base + extra, 5);
}
export interface MemberWorkflowTimelineProps {
  workflowSteps: WorkflowStep[];
  expandedStep: number | null;
  onToggleStep: (stepId: number) => void;
  hasOfferLetter: boolean;
  selectedCaseId: string;
  activeOffer: any;
  isOfferAccepted: boolean;
  totalCompensation?: number;
}

export const MemberWorkflowTimeline: React.FC<MemberWorkflowTimelineProps> = ({
  workflowSteps,
  expandedStep,
  onToggleStep,
  hasOfferLetter,
  selectedCaseId,
  activeOffer,
  isOfferAccepted,
  totalCompensation = 0,
}) => {
  const { notify } = useNotification();
  const [paymentCase, setPaymentCase] = useState<any>(null);
  const [loadingPayment, setLoadingPayment] = useState<boolean>(false);
  const [confirmingReceipt, setConfirmingReceipt] = useState<boolean>(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState<boolean>(false);
  const [showDisputeModal, setShowDisputeModal] = useState<boolean>(false);
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [submittingDispute, setSubmittingDispute] = useState<boolean>(false);
  useEffect(() => {
    if (!selectedCaseId) return;
    let isMounted = true;
    async function fetchPayment() {
      setLoadingPayment(true);
      try {
        const res = await paymentApi.getStatus(selectedCaseId);
        if (isMounted && res?.paymentCase) {
          setPaymentCase(res.paymentCase);
        }
      } catch {
        // Silently tolerate if no payment case exists yet
      } finally {
        if (isMounted) setLoadingPayment(false);
      }
    }
    fetchPayment();
    return () => {
      isMounted = false;
    };
  }, [selectedCaseId]);

  const handleConfirmReceipt = async () => {
    if (!selectedCaseId) return;
    setConfirmingReceipt(true);
    try {
      await paymentApi.confirmReceipt({ caseId: selectedCaseId, role: 'DISPLACED_COMMUNITY_MEMBER' });
      notify({
        type: 'success',
        title: 'Receipt Confirmed',
        message: 'Thank you for confirming receipt of payment. Your case is now marked as Paid.',
      });
      const res = await paymentApi.getStatus(selectedCaseId);
      if (res?.paymentCase) setPaymentCase(res.paymentCase);
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

  const handleDownloadReceipt = async () => {
    if (!selectedCaseId) return;
    setDownloadingReceipt(true);
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
        message: err.message || 'Official receipt will be available once payment transfer is completed.',
      });
    } finally {
      setDownloadingReceipt(false);
    }
  };

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || !disputeReason.trim()) return;
    setSubmittingDispute(true);
    try {
      await paymentApi.dispute(selectedCaseId, disputeReason.trim());
      notify({
        type: 'success',
        title: 'Dispute Registered',
        message: 'Payment dispute submitted to Land Administration for review.',
      });
      setShowDisputeModal(false);
      setDisputeReason('');
      const res = await paymentApi.getStatus(selectedCaseId);
      if (res?.paymentCase) setPaymentCase(res.paymentCase);
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
  return (
    <div className="space-y-3">
      {workflowSteps.map((step) => {
        const isCompleted = step.status === 'completed';
        const isCurrent = step.status === 'current';
        const isUpcoming = step.status === 'upcoming';
        // Lock upcoming steps from expanding
        const isLocked = isUpcoming;
        const isExpanded = expandedStep === step.id && !isLocked;

        return (
          <div
            key={step.id}
            className={`rounded-2xl transition-all border overflow-hidden ${
              isCurrent
                ? 'bg-violet-50/70 border-violet-400 shadow-md ring-2 ring-violet-200'
                : isCompleted
                ? 'bg-white border-slate-200 shadow-sm'
                : 'bg-white/60 border-slate-200 opacity-70'
            }`}
          >
            {/* Step Header */}
            <div
              onClick={() => {
                if (isLocked) return;
                onToggleStep(step.id);
              }}
              className={`p-4 flex items-start gap-3.5 select-none transition ${
                isLocked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer active:bg-slate-50'
              }`}
            >
              {/* Circle Badge */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5 ${
                  isCompleted
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : isCurrent
                    ? 'bg-violet-600 text-white shadow-sm ring-4 ring-violet-200 animate-pulse'
                    : 'bg-slate-200 text-slate-500 border border-slate-300'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : isLocked ? <Lock className="w-3 h-3" /> : step.id}
              </div>

              {/* Step Titles */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800'
                        : isCurrent
                        ? 'bg-violet-200 text-violet-900 font-extrabold'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {step.badgeText}
                  </span>
                  {step.date && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {step.date}
                    </span>
                  )}
                </div>

                <h3
                  className={`text-xs sm:text-sm font-bold truncate ${
                    isCurrent ? 'text-violet-950' : 'text-slate-900'
                  }`}
                >
                  {step.title}
                </h3>
                <p className="text-[11px] text-slate-500 truncate">{step.subtitle}</p>
              </div>

              {/* Accordion Chevron or Lock Icon */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isLocked ? (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold bg-slate-100 px-2 py-0.5 rounded-lg">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Locked</span>
                  </span>
                ) : (
                  <div className="text-slate-400 p-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                )}
              </div>
            </div>

            {/* Expanded Step Body */}
            {isExpanded && !isLocked && (
              <div className="px-4 pb-4 pt-1 text-xs text-slate-600 border-t border-slate-200/70 space-y-3">
                <p className="text-xs leading-relaxed pt-1">{step.description}</p>

                {step.details && step.details.length > 0 && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {step.details.map((d, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400 font-medium shrink-0">{d.label}:</span>
                        <span className="font-bold text-slate-800 truncate">{d.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Current Actionable Buttons */}
                {isCurrent && step.id === 3 && hasOfferLetter && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Link
                      to={`/member/offer-letter?caseId=${selectedCaseId}&offerId=${activeOffer?.offerId || ''}`}
                      className="flex-1 py-2.5 px-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Offer Letter Details</span>
                    </Link>
                    {isOfferAccepted && (
                      <Link
                        to={`/member/bank-details?caseId=${selectedCaseId}`}
                        className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm text-center transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Manage Bank Details</span>
                      </Link>
                    )}
                  </div>
                )}

                {/* Embedded Live Payment Card for Stage 5 */}
                {step.id === 5 && (() => {
                  const awardAmount = paymentCase?.amount || totalCompensation || activeOffer?.offerAmount || 0;
                  const reqSigs = getEffectiveRequiredSigs(awardAmount, paymentCase?.requiredSignatures);
                  const curSigs = paymentCase?.currentSignatures ?? paymentCase?.authorisations?.length ?? 0;
                  const rawStatus = paymentCase?.status || 'BANK_DETAILS_PENDING';
                  const memberDisplay = getMemberDisplayStatus(rawStatus);

                  const isBankPending =
                    memberDisplay.label === 'Bank Details Pending' ||
                    memberDisplay.label === 'New Bank Details Pending' ||
                    rawStatus === 'BANK_DETAILS_PENDING' ||
                    rawStatus === 'NEW_BANK_DETAILS_PENDING';

                  const isBankVerified = !isBankPending && Boolean(paymentCase?.bankName && paymentCase?.accountNumber);
                  const isPaid = rawStatus === 'PAID' || memberDisplay.label === 'Paid';
                  const isTransferSucceed = rawStatus === 'TRANSFER_SUCCEED' || memberDisplay.label === 'Payment Completed';

                  const isInitiated = Boolean(
                    !isBankPending &&
                    rawStatus !== 'READY_TO_INITIATE' &&
                    rawStatus !== 'Ready to Initiate' &&
                    (curSigs > 0 || (paymentCase?.authorisations && paymentCase.authorisations.length > 0))
                  );

                  const isFullyApproved = Boolean(
                    isPaid ||
                    isTransferSucceed ||
                    rawStatus === 'BANK_APPROVAL_PENDING' ||
                    rawStatus === 'SCHEDULED' ||
                    (isInitiated && curSigs >= reqSigs && reqSigs > 0)
                  );

                  const currentWorkflowStep = (() => {
                    if (isPaid) return 5;
                    if (isTransferSucceed) return 4;
                    if (isFullyApproved) return 4;
                    if (isInitiated) return 3;
                    if (isBankVerified) return 3;
                    return 2;
                  })();

                  const disbursementSteps = [
                    {
                      step: 1,
                      title: 'Offer Accepted',
                      subtitle: 'Statutory Form H award accepted by landowner',
                      completed: true,
                    },
                    {
                      step: 2,
                      title: 'Bank Details Verified',
                      subtitle: isBankVerified
                        ? `${paymentCase?.bankName} (•••• ${paymentCase?.accountNumber?.slice(-4)}) recorded`
                        : isBankPending
                        ? 'Awaiting beneficiary bank details submission'
                        : 'Bank details submission recorded',
                      completed: isBankVerified,
                      isCurrent: !isBankVerified,
                      actionRequired: isBankPending,
                    },
                    {
                      step: 3,
                      title: 'Multi-Signature Governance',
                      subtitle: isBankPending
                        ? `Dual administrative governance approval (Pending Step 2)`
                        : isInitiated
                        ? `Cryptographic dual authorisation (${curSigs}/${reqSigs} signatures)`
                        : `Awaiting initiation (${reqSigs} signatures required)`,
                      completed: currentWorkflowStep >= 4 || isFullyApproved || isTransferSucceed || isPaid,
                      isCurrent: isBankVerified && !isFullyApproved,
                    },
                    {
                      step: 4,
                      title: 'Bank Clearing House',
                      subtitle: 'Electronic Fund Transfer clearance by commercial bank network',
                      completed: currentWorkflowStep >= 5 || isPaid,
                      isCurrent: isFullyApproved && !isPaid,
                    },
                    {
                      step: 5,
                      title: 'Disbursement Confirmed',
                      subtitle: 'Statutory funds verified and confirmed received by landowner beneficiary',
                      completed: isPaid,
                      isCurrent: isTransferSucceed && !isPaid,
                    },
                  ];

                  return (
                    <div className="bg-md-surface-container border border-md-outline/15 rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm mt-2">
                      {/* Payment Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-md-outline/15 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                              {paymentCase?.paymentId || `PMT-${selectedCaseId}`}
                            </span>
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${memberDisplay.badgeClass}`}>
                              {memberDisplay.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Official Statutory Compensation Disbursement
                          </p>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 font-medium block">Total Award Amount</span>
                          <span className="text-base sm:text-lg font-black text-slate-900">
                            {formatCurrencyRM(awardAmount)}
                          </span>
                        </div>
                      </div>

                      {/* Beneficiary & Governance Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-md-surface p-3 rounded-2xl border border-md-outline/10 flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                            <Building2 size={16} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                              Beneficiary Bank Account
                            </span>
                            {paymentCase?.bankName && paymentCase?.accountNumber ? (
                              <div className="mt-0.5">
                                <span className="text-xs font-bold text-slate-800">
                                  {paymentCase.bankName}
                                </span>
                                <span className="text-xs font-mono text-slate-600 block">
                                  •••• {paymentCase.accountNumber.slice(-4)}
                                  {paymentCase.accountHolderName && ` (${paymentCase.accountHolderName})`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-amber-700 block mt-0.5">
                                Awaiting Bank Details Submission
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="bg-md-surface p-3 rounded-2xl border border-md-outline/10 flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center shrink-0 mt-0.5">
                            <ShieldCheck size={16} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                              Government Multi-Sig Authorization
                            </span>
                            <div className="mt-0.5">
                              <span className={`text-xs font-bold ${isFullyApproved ? 'text-emerald-700' : isInitiated ? 'text-amber-700' : 'text-slate-800'}`}>
                                {isFullyApproved
                                  ? `Fully Approved (${reqSigs} of ${reqSigs} Signatures)`
                                  : isInitiated
                                  ? `${curSigs} of ${reqSigs} Required Signatures Recorded`
                                  : `Awaiting Initiation (${reqSigs} Signatures Required)`}
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                {isFullyApproved
                                  ? 'Disbursement authorized by Land Office'
                                  : isInitiated
                                  ? 'Pending tiered government officer authorizations'
                                  : 'Tiered governance sign-off required prior to bank release'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bank Details Pending Notice Banner */}
                      {isBankPending && (
                        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-start gap-2.5">
                            <CreditCard size={18} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                                Beneficiary Bank Details Required
                              </h4>
                              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                                Land Administrators cannot initiate your fund transfer until your bank account is registered.
                              </p>
                            </div>
                          </div>
                          <Link
                            to={`/member/bank-details?caseId=${encodeURIComponent(selectedCaseId)}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition w-full sm:w-auto shrink-0 justify-center"
                          >
                            <span>Submit Bank Details</span>
                            <ArrowRight size={14} />
                          </Link>
                        </div>
                      )}

                      {/* Transfer Succeed Banner */}
                      {isTransferSucceed && (
                        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-start gap-2.5">
                            <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-100">
                                Payment Completed & Disbursed
                              </h4>
                              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                                Funds have been credited to your bank account. Please verify your balance and confirm receipt below.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                            <Button
                              variant="filled"
                              size="sm"
                              className="!bg-emerald-600 !text-white hover:!bg-emerald-700 text-xs font-bold w-full sm:w-auto"
                              disabled={confirmingReceipt}
                              onClick={handleConfirmReceipt}
                            >
                              <CheckCircle2 size={14} />
                              <span>{confirmingReceipt ? 'Confirming...' : 'Confirm Receipt'}</span>
                            </Button>
                            <Button
                              variant="outlined"
                              size="sm"
                              className="text-xs w-full sm:w-auto"
                              onClick={() => setShowDisputeModal(true)}
                            >
                              <AlertTriangle size={14} />
                              <span>Not Received</span>
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* ------------------------------------------------------------- */}
                      {/* IMAGE #3 SECTION 1: DISBURSEMENT PROGRESS WORKFLOW STEPPER    */}
                      {/* ------------------------------------------------------------- */}
                      <div className="bg-md-surface-container/60 border border-md-outline/15 rounded-2xl p-4 sm:p-5 shadow-xs">
                        <h3 className="text-xs font-bold text-md-on-surface mb-4 flex items-center gap-2">
                          <ShieldCheck size={16} className="text-md-primary" />
                          <span>Disbursement Progress Workflow</span>
                        </h3>

                        <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-5 relative">
                          {disbursementSteps.map((s, idx) => {
                            const isDone = s.completed;
                            const isCur = !isDone && (idx === 0 || disbursementSteps[idx - 1].completed);

                            return (
                              <div
                                key={s.step}
                                className="flex sm:flex-col items-start sm:items-center gap-3 sm:gap-2 relative text-left sm:text-center"
                              >
                                {idx < disbursementSteps.length - 1 && (
                                  <div
                                    className={`hidden sm:block absolute top-3.5 left-1/2 w-full h-0.5 -z-0 ${
                                      disbursementSteps[idx + 1].completed
                                        ? 'bg-emerald-500'
                                        : isDone
                                        ? 'bg-md-primary/40'
                                        : 'bg-md-outline/20'
                                    }`}
                                  />
                                )}

                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-200 z-10 ${
                                    isDone
                                      ? 'bg-emerald-500 text-white shadow-xs'
                                      : isCur
                                      ? 'bg-md-primary text-md-on-primary ring-4 ring-md-primary/20 animate-pulse'
                                      : 'bg-md-surface-container-low text-md-on-surface-variant border border-md-outline/30'
                                  }`}
                                >
                                  {isDone ? <CheckCircle2 size={16} /> : s.step}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <span
                                    className={`text-xs font-bold block ${
                                      isDone
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : isCur
                                        ? 'text-md-primary font-extrabold'
                                        : 'text-md-on-surface-variant'
                                    }`}
                                  >
                                    {s.title}
                                  </span>
                                  <span className="text-[10px] text-md-on-surface-variant leading-tight block mt-0.5">
                                    {s.subtitle}
                                  </span>

                                  {s.actionRequired && (
                                    <Link
                                      to={`/member/bank-details?caseId=${encodeURIComponent(selectedCaseId)}`}
                                      className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 underline mt-1"
                                    >
                                      <span>Submit Bank Details Now</span>
                                      <ArrowRight size={11} />
                                    </Link>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* ------------------------------------------------------------- */}
                      {/* IMAGE #3 SECTION 2: OFFICIAL LEGAL DOCUMENTATION CARD         */}
                      {/* ------------------------------------------------------------- */}
                      <div className="bg-md-surface-container/60 border border-md-outline/15 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-bold text-md-on-surface flex items-center gap-2">
                            <Download size={15} className="text-md-primary" />
                            <span>Official Legal Documentation</span>
                          </h4>
                          <p className="text-[11px] text-md-on-surface-variant mt-0.5">
                            Official Land Acquisition Act 1960 payment voucher & statutory compensation disbursement certificate.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
                          <Button
                            variant="tonal"
                            size="sm"
                            onClick={handleDownloadReceipt}
                            disabled={downloadingReceipt}
                            className="flex-1 sm:flex-initial text-xs"
                          >
                            <Download size={14} />
                            <span>{downloadingReceipt ? 'Downloading...' : 'Download Receipt'}</span>
                          </Button>

                          <Button
                            variant="text"
                            size="sm"
                            onClick={() => setShowDisputeModal(true)}
                            className="flex-1 sm:flex-initial text-xs text-md-on-surface-variant hover:text-red-600"
                          >
                            <AlertTriangle size={14} />
                            <span>Contest / Dispute</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })}

      {/* Dispute Modal */}
      <Modal
        isOpen={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        title="Submit Payment Dispute"
        subtitle={`Case ${selectedCaseId}`}
        cancelText="Cancel"
        confirmText={submittingDispute ? "Submitting..." : "Submit Dispute"}
        confirmVariant="danger"
        confirmLoading={submittingDispute}
        onConfirm={handleDisputeSubmit as any}
      >
        <form onSubmit={handleDisputeSubmit} className="space-y-4 pt-2">
          <p className="text-xs text-md-on-surface-variant leading-relaxed">
            If you have not received your statutory compensation, or if the credited amount differs from the official Form H award, please state the grounds of your dispute below. A Land Administrator will review the bank settlement ledger.
          </p>
          <div className="space-y-1.5">
            <Textarea
              label="Dispute Explanation & Remarks"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Detail any discrepancy, delayed clearance, or bank transaction reference..."
              rows={4}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
