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
  UploadCloud
} from 'lucide-react';
import { paymentApi } from '../../services/paymentApi';
import { normalizePaymentStatus, getMemberDisplayStatus } from '../Payment/statusMaps';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useAuth } from '../../context/AuthContext';
import { ConfirmSubmitModal, ConfirmRow } from '../../components/member/ConfirmSubmitModal';
import { BankDetailsForm } from './components/BankDetailsForm';

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
  currentSignatures?: number;
  requiredSignatures?: number;
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
  }, [requestedCaseId]);

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

  const rawStatus = paymentCase?.status || activeCaseInfo?.status || 'BANK_DETAILS_PENDING';
  const memberDisplay = getMemberDisplayStatus(rawStatus);
  const memberStatusLabel = memberDisplay.label;
  const memberBadgeClass = memberDisplay.badgeClass;

  const isBankPending = memberStatusLabel === 'Bank Details Pending' || memberStatusLabel === 'New Bank Details Pending';
  const isPaymentInProgress = memberStatusLabel === 'Payment In Progress';
  const isTransferSucceed = memberStatusLabel === 'Payment Completed';
  const isPaid = memberStatusLabel === 'Paid';

  // Step 2 is completed ONLY when bank details have been submitted and the case is in an operational disbursement status
  const isBankVerified = !isBankPending && Boolean(paymentCase?.bankName && paymentCase?.accountNumber);

  const currentStep = useMemo(() => {
    if (isPaid) return 5;
    if (isTransferSucceed) return 4;
    if (isPaymentInProgress) return 3;
    if (isBankVerified) return 2;
    return 1; // Bank details pending -> Step 2 is active, requiring action
  }, [isPaid, isTransferSucceed, isPaymentInProgress, isBankVerified]);

  const steps = [
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
        : 'Bank details submission verified',
      completed: isBankVerified,
      isCurrent: isBankPending,
      actionRequired: isBankPending,
    },
    {
      step: 3,
      title: 'Multi-Signature Governance',
      subtitle: isBankPending
        ? 'Dual administrative governance approval (Pending Step 2)'
        : paymentCase?.requiredSignatures
        ? `Cryptographic dual authorisation (${paymentCase.currentSignatures || 0}/${paymentCase.requiredSignatures} signatures)`
        : 'Dual administrative governance approval',
      completed: currentStep >= 4 || isTransferSucceed || isPaid,
    },
    {
      step: 4,
      title: 'Bank Clearing House',
      subtitle: 'Electronic Fund Transfer clearance by commercial bank network',
      completed: currentStep >= 5 || isPaid,
    },
    {
      step: 5,
      title: 'Disbursement Confirmed',
      subtitle: 'Statutory funds verified and confirmed received by landowner beneficiary',
      completed: isPaid,
    },
  ];

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

  // FR-017: first confirmation = the dispute dialog's Submit button (validates),
  // second confirmation = the ConfirmSubmitModal that actually dispatches.
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

  return (
    <div className="max-w-3xl mx-auto pt-6 sm:pt-8 pb-12 px-4 sm:px-6 space-y-6">
      {/* Page Header */}
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

      {/* Case Switcher Dropdown (always a dropdown; labels carry case details) */}
      {availableCases.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-end gap-2">
          <div className="sm:w-[420px]">
            <Select
              label="Select Case"
              placeholder={loadingCases ? 'Loading your cases…' : 'Select a case…'}
              options={availableCases.map((c) => ({
                value: c.caseId,
                label: `${c.caseId} — ${c.projectName} · ${c.lotNo} · RM ${c.amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })} [${getMemberDisplayStatus(c.status).label}]`,
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
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
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
              RM {(paymentCase?.amount || activeCaseInfo?.amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-md-on-surface-variant block mt-0.5">
              Form H Legal Entitlement
            </span>
          </div>
        </div>

        {/* Payment Record Key Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
          <div>
            <span className="text-md-on-surface-variant block">Payment ID</span>
            <span className="font-mono font-semibold text-md-on-surface">
              {paymentCase?.id || `PMT-${selectedCaseId}`}
            </span>
          </div>
          <div>
            <span className="text-md-on-surface-variant block">Beneficiary Bank</span>
            <span className="font-semibold text-md-on-surface truncate block">
              {paymentCase?.bankName || (isBankVerified ? 'Registered' : 'Pending Submission')}
            </span>
          </div>
          <div>
            <span className="text-md-on-surface-variant block">Account Number</span>
            <span className="font-mono font-semibold text-md-on-surface">
              {paymentCase?.accountNumber ? `•••• ${paymentCase.accountNumber.slice(-4)}` : '—'}
            </span>
          </div>
          <div>
            <span className="text-md-on-surface-variant block">Multi-Sig Status</span>
            <span className="font-semibold text-md-on-surface">
              {paymentCase?.requiredSignatures
                ? `${paymentCase.currentSignatures || 0} of ${paymentCase.requiredSignatures} Signatures`
                : isPaid ? 'Fully Approved' : 'In Governance'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Prompt if Bank Details Missing — scrolls to the inline form */}
      {isBankPending && (
        <div className="p-4 sm:p-5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <CreditCard size={20} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                {rawStatus && normalizePaymentStatus(rawStatus) === 'New Bank Details Pending'
                  ? 'New Bank Details Required'
                  : 'Beneficiary Bank Details Required'}
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                Government Administrators cannot initiate your fund transfer until your bank account is registered. Use the submission form below the workflow.
              </p>
            </div>
          </div>
          <Button
            variant="filled"
            onClick={scrollToBankForm}
            className="w-full sm:w-auto shrink-0"
          >
            <span>Go to Submission Form</span>
            <ArrowRight size={16} />
          </Button>
        </div>
      )}

      {/* Prominent Transfer Succeed Confirmation Banner adhering to Phase 6 */}
      {isTransferSucceed && (
        <div className="p-5 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
          <div className="flex items-start gap-3.5">
            <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-emerald-950 dark:text-emerald-100">
                Payment Completed & Disbursed
              </h3>
              <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 mt-1 leading-relaxed">
                Payment has been disbursed by the bank to your account. Please check your bank balance and confirm receipt below.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0">
            <Button
              variant="filled"
              className="!bg-emerald-600 !text-white hover:!bg-emerald-700 w-full sm:w-auto font-semibold"
              onClick={() => setShowReceiptConfirm(true)}
            >
              <CheckCircle2 size={16} />
              <span>Confirm Payment Received</span>
            </Button>
            <Button
              variant="outlined"
              className="w-full sm:w-auto"
              onClick={() => setShowDisputeModal(true)}
            >
              <AlertTriangle size={15} />
              <span>Payment Not Received</span>
            </Button>
          </div>
        </div>
      )}

      {/* Step Progress Tracker Card */}
      <div className="bg-md-surface-container border border-md-outline/15 rounded-xl p-5 sm:p-6 shadow-sm">
        <h3 className="text-sm font-bold text-md-on-surface mb-6 flex items-center gap-2">
          <ShieldCheck size={18} className="text-md-primary" />
          <span>Disbursement Progress Workflow</span>
        </h3>

        {/* Responsive Steps: Vertical on Mobile, Horizontal on Tablet/Desktop */}
        <div className="space-y-6 sm:space-y-0 sm:grid sm:grid-cols-5 relative">
          {steps.map((s, idx) => {
            const isDone = s.completed;
            const isCurrent = !isDone && (idx === 0 || steps[idx - 1].completed);

            return (
              <div
                key={s.step}
                className="flex sm:flex-col items-start sm:items-center gap-4 sm:gap-2 relative text-left sm:text-center"
              >
                {/* Connector line for desktop */}
                {idx < steps.length - 1 && (
                  <div
                    className={`hidden sm:block absolute top-4 left-1/2 w-full h-0.5 -z-0 ${
                      steps[idx + 1].completed
                        ? 'bg-emerald-500'
                        : isDone
                        ? 'bg-md-primary/40'
                        : 'bg-md-outline/20'
                    }`}
                  />
                )}

                {/* Step Circle Icon */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-200 z-10 ${
                    isDone
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : isCurrent
                      ? 'bg-md-primary text-md-on-primary ring-4 ring-md-primary/20 animate-pulse'
                      : 'bg-md-surface-container-low text-md-on-surface-variant border border-md-outline/30'
                  }`}
                >
                  {isDone ? <CheckCircle2 size={18} /> : s.step}
                </div>

                {/* Step Text Info */}
                <div className="min-w-0 flex-1">
                  <span
                    className={`text-xs font-bold block ${
                      isDone
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : isCurrent
                        ? 'text-md-primary'
                        : 'text-md-on-surface-variant'
                    }`}
                  >
                    {s.title}
                  </span>
                  <span className="text-[11px] text-md-on-surface-variant leading-tight block mt-0.5">
                    {s.subtitle}
                  </span>

                  {s.actionRequired && (
                    <button
                      type="button"
                      onClick={scrollToBankForm}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 underline mt-1 cursor-pointer"
                    >
                      <span>Submit Bank Details Now</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inline Bank Details Submission (migrated from /member/bank-details).
          Shown only while the workflow sits at step 2 — after a successful
          submit the status refreshes, the workflow advances to step 3 and the
          form disappears unless the case returns to New Bank Details Pending. */}
      {isBankPending && selectedCaseId && (
        <div ref={bankFormRef} className="scroll-mt-24">
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

      {/* Official Receipt & Actions Card */}
      <div className="bg-md-surface-container border border-md-outline/15 rounded-xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-md-on-surface flex items-center gap-2">
            <Download size={16} className="text-md-primary" />
            <span>Official Legal Documentation</span>
          </h4>
          <p className="text-xs text-md-on-surface-variant mt-0.5">
            Official Land Acquisition Act 1960 payment voucher & statutory compensation disbursement certificate.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {(isPaid || isTransferSucceed) && (
            <Button
              variant="tonal"
              onClick={handleDownloadReceipt}
              className="flex-1 sm:flex-initial"
            >
              <Download size={16} />
              <span>Download Receipt</span>
            </Button>
          )}

          {/* FR-013: the member choice point is Transfer Succeed only — once Paid,
              the Download Receipt button above is the sole remaining action. */}
          {isTransferSucceed && (
            <Button
              variant="text"
              onClick={() => setShowDisputeModal(true)}
              className="flex-1 sm:flex-initial text-md-on-surface-variant hover:text-red-600"
            >
              <AlertTriangle size={16} />
              <span>Contest / Dispute</span>
            </Button>
          )}
        </div>
      </div>
      </>
      )}
      {/* Dispute Modal — shared Modal component: portal to <body> with the
          locked fullscreen overlay (DESIGN.md), never clipped by page chrome. */}
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
              Review & Submit Dispute
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
      {/* FR-017 second confirmations */}
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
              value={`RM ${(paymentCase?.amount || activeCaseInfo?.amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`}
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
