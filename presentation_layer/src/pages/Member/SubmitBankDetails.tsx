import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Building2, 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  Landmark, 
  FileText, 
  Lock,
  ChevronRight,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { paymentApi } from '../../services/paymentApi';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Select, type SelectOption } from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox';
import { useNotification } from '../../components/ui/NotificationSystem';
import { normalizePaymentStatus, getMemberDisplayStatus } from '../Payment/statusMaps';
// Standard Malaysian Commercial & Islamic Banks
const MALAYSIAN_BANKS: SelectOption[] = [
  { value: 'Maybank', label: 'Maybank (Malayan Banking Berhad)' },
  { value: 'CIMB Bank', label: 'CIMB Bank Berhad' },
  { value: 'Public Bank', label: 'Public Bank Berhad' },
  { value: 'RHB Bank', label: 'RHB Bank Berhad' },
  { value: 'Hong Leong Bank', label: 'Hong Leong Bank Berhad' },
  { value: 'AmBank', label: 'AmBank (M) Berhad' },
  { value: 'Bank Islam', label: 'Bank Islam Malaysia Berhad' },
  { value: 'Affin Bank', label: 'Affin Bank Berhad' },
  { value: 'Alliance Bank', label: 'Alliance Bank Malaysia Berhad' },
  { value: 'OCBC Bank Malaysia', label: 'OCBC Bank (Malaysia) Berhad' },
];

interface DiscoveredCase {
  caseId: string;
  projectName?: string;
  lotNo?: string;
  amount: number;
  status: string;
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
}

export default function MemberSubmitBankDetails() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCaseId = searchParams.get('caseId');

  const [loadingCases, setLoadingCases] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);
  const [availableCases, setAvailableCases] = useState<DiscoveredCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(requestedCaseId || '');
  const [savedAccounts, setSavedAccounts] = useState<any[]>([]);
  const [accountChoice, setAccountChoice] = useState<'saved' | 'new'>('new');
  const [selectedSavedIndex, setSelectedSavedIndex] = useState<number>(0);

  // Form State
  const [bankName, setBankName] = useState<string>('Maybank');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  const [myKadNumber, setMyKadNumber] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [consentDeclared, setConsentDeclared] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const applySaved = (acc: any) => {
    if (!acc) return;
    setBankName(acc.bankName || 'Maybank');
    setAccountNumber(acc.accountNumber || '');
    if (acc.accountHolderName) setAccountHolderName(acc.accountHolderName);
    if (acc.myKadNumber) setMyKadNumber(acc.myKadNumber);
    if (acc.phoneNumber) setPhoneNumber(acc.phoneNumber);
  };
  // Discover cases on load
  useEffect(() => {
    let isMounted = true;

    async function loadCases() {
      setLoadingCases(true);
      try {
        const res = await paymentApi.getAllCases();
        const cases: any[] = res.cases || [];

        // Strict RBAC: filter cases that belong strictly to this logged-in member
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

        // Filter out cases that have already submitted bank details.
        // On Submit Beneficiary Bank Details page, ONLY show cases requiring bank details submission.
        const pendingSubmissionCases = memberCases.filter((c: any) => {
          const norm = normalizePaymentStatus(c.status);
          return (
            c.status === 'BANK_DETAILS_PENDING' ||
            c.status === 'NEW_BANK_DETAILS_PENDING' ||
            c.status === 'OFFER_ACCEPTED' ||
            c.status === 'offer_accepted' ||
            norm === 'Bank Details Pending' ||
            norm === 'New Bank Details Pending'
          );
        });

        let targetCases = pendingSubmissionCases;
        if (targetCases.length === 0 && requestedCaseId) {
          const requestedMatch = memberCases.find(
            (c: any) => c.caseId.toLowerCase() === requestedCaseId.toLowerCase()
          );
          if (requestedMatch) {
            targetCases = [requestedMatch];
          }
        }

        // Format discovered member cases
        const mapped: DiscoveredCase[] = targetCases.map((c) => ({
          caseId: c.caseId,
          projectName: c.acquisitionCase?.project?.projectName || `Land Acquisition ${c.caseId}`,
          lotNo: c.acquisitionCase?.landParcel?.lotNo || 'Lot Parcel',
          amount: Number(c.amount) || 0,
          status: c.status,
          bankName: c.bankName || undefined,
          accountNumber: c.accountNumber || undefined,
          accountHolderName: c.accountHolderName || undefined,
        }));
        if (isMounted) {
          setAvailableCases(mapped);
          if (mapped.length > 0) {
            const target = requestedCaseId 
              ? mapped.find((item) => item.caseId.toLowerCase() === requestedCaseId.toLowerCase())
              : mapped.find((item) => !item.bankName) || mapped[0];
            
            const picked = target || mapped[0];
            setSelectedCaseId(picked.caseId);
            if (picked.bankName) setBankName(picked.bankName);
            if (picked.accountNumber) setAccountNumber(picked.accountNumber);
          } else {
            setSelectedCaseId('');
          }
        }

        // Load saved bank accounts
        try {
          const savedRes = await paymentApi.getSavedBankDetails();
          const accounts = savedRes.savedAccounts || [];
          if (isMounted && accounts.length > 0) {
            setSavedAccounts(accounts);
            setAccountChoice('saved');
            setSelectedSavedIndex(0);
            applySaved(accounts[0]);
          }
        } catch {}
      } catch {
        if (isMounted) {
          setAvailableCases([]);
          setSelectedCaseId('');
        }
      } finally {
        if (isMounted) setLoadingCases(false);
      }
    }

    loadCases();
    return () => {
      isMounted = false;
    };
  }, [requestedCaseId]);

  // Pre-fill user profile fields
  useEffect(() => {
    if (user?.name && !accountHolderName) {
      setAccountHolderName(user.name);
    }
    if (user?.identificationNumber && !myKadNumber) {
      setMyKadNumber(user.identificationNumber);
    }
    if (user?.contactNumber && !phoneNumber) {
      setPhoneNumber(user.contactNumber);
    }
  }, [user]);
  const activeCase = useMemo(() => {
    return availableCases.find((c) => c.caseId === selectedCaseId) || availableCases[0];
  }, [availableCases, selectedCaseId]);

  const effectiveMyKad = (user?.identificationNumber || myKadNumber || '').trim();

  const isCaseSubmissionLocked = useMemo(() => {
    if (!activeCase) return false;
    const st = activeCase.status;
    const norm = normalizePaymentStatus(st);
    if (
      st === 'BANK_DETAILS_PENDING' ||
      norm === 'Bank Details Pending' ||
      st === 'NEW_BANK_DETAILS_PENDING' ||
      norm === 'New Bank Details Pending' ||
      st === 'OFFER_ACCEPTED' ||
      st === 'offer_accepted'
    ) {
      return false;
    }
    return true;
  }, [activeCase]);
  const isFormValid = Boolean(
    selectedCaseId &&
    bankName &&
    accountNumber &&
    accountNumber.replace(/[^0-9]/g, '').length >= 6 &&
    accountHolderName.trim().length > 0 &&
    effectiveMyKad.length > 0 &&
    consentDeclared &&
    !isCaseSubmissionLocked
  );


  const handleCaseSelect = (caseId: string) => {
    setSelectedCaseId(caseId);
    setSearchParams({ caseId });
    const target = availableCases.find((c) => c.caseId === caseId);
    if (target?.bankName) setBankName(target.bankName);
    if (target?.accountNumber) setAccountNumber(target.accountNumber);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!selectedCaseId) errs.caseId = 'Please select an acquisition case';
    if (!bankName) errs.bankName = 'Please select your bank';
    if (!accountNumber || accountNumber.replace(/[^0-9]/g, '').length < 6) {
      errs.accountNumber = 'Valid account number is required (min 6 digits)';
    }
    if (!accountHolderName.trim()) {
      errs.accountHolderName = 'Account holder name is required';
    }
    if (!consentDeclared) {
      errs.consent = 'You must declare the accuracy of these bank details';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCaseSubmissionLocked) {
      notify({
        type: 'error',
        title: 'Submission Blocked',
        message: `Bank details for Case ${selectedCaseId} have already been submitted and are in progress.`,
      });
      return;
    }
    if (!validate()) {
      notify({
        type: 'error',
        title: 'Form Validation Error',
        message: 'Please resolve the highlighted fields before submitting.',
      });
      return;
    }

    setSubmitting(true);
    try {
      await paymentApi.submitBankDetails({
        caseId: selectedCaseId,
        bankName,
        accountNumber: accountNumber.trim(),
        accountHolderName: accountHolderName.trim(),
        myKadNumber: effectiveMyKad,
        phoneNumber: phoneNumber.trim(),
      });

      // Save as default for future cases if new
      await paymentApi.saveDefaultBankDetails({
        bankName,
        accountNumber: accountNumber.trim(),
        accountHolderName: accountHolderName.trim(),
        myKadNumber: effectiveMyKad,
        phoneNumber: phoneNumber.trim(),
      }).catch(() => {});
      notify({
        type: 'success',
        title: 'Bank Details Submitted',
        message: 'Your banking details have been securely recorded and queued for verification.',
      });

      setSubmittedSuccess(true);
    } catch (err: any) {
      notify({
        type: 'error',
        title: 'Submission Failed',
        message: err.message || 'Unable to submit bank details. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-6 sm:py-10">
        <div className="bg-md-surface-container border border-md-outline/15 rounded-xl p-6 sm:p-8 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-5">
            <CheckCircle2 size={36} />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-md-on-surface mb-2">
            Bank Details Successfully Submitted
          </h2>
          <p className="text-sm text-md-on-surface-variant max-w-md mx-auto mb-6">
            Your statutory compensation account information for Case Reference{' '}
            <span className="font-mono font-bold text-md-on-surface">{selectedCaseId}</span> has been securely stored and marked as <span className="font-semibold text-cyan-700 dark:text-cyan-400">Bank Details Submitted</span>.
          </p>

          <div className="bg-md-surface-container-low rounded-xl p-4 text-left mb-6 border border-md-outline/15">
            <h3 className="text-xs font-bold uppercase tracking-wider text-md-on-surface-variant mb-3 flex items-center gap-1.5">
              <Landmark size={14} className="text-md-primary" />
              <span>Registered Banking Profile</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-md-on-surface-variant block">Bank Name</span>
                <span className="font-semibold text-md-on-surface">{bankName}</span>
              </div>
              <div>
                <span className="text-md-on-surface-variant block">Account Number</span>
                <span className="font-mono font-semibold text-md-on-surface">
                  •••• {accountNumber.slice(-4)}
                </span>
              </div>
              <div>
                <span className="text-md-on-surface-variant block">Account Holder</span>
                <span className="font-semibold text-md-on-surface">{accountHolderName}</span>
              </div>
              <div>
                <span className="text-md-on-surface-variant block">MyKad / NRIC</span>
                <span className="font-mono font-semibold text-md-on-surface">{myKadNumber}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
            <Button
              variant="text"
              onClick={() => navigate('/member')}
              className="w-full sm:w-auto"
            >
              <ArrowLeft size={16} />
              <span>Back to Overview</span>
            </Button>
            <Button
              variant="filled"
              onClick={() => navigate(`/member/payment-status?caseId=${encodeURIComponent(selectedCaseId)}`)}
              className="w-full sm:w-auto"
            >
              <span>Track Payment Status</span>
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pt-6 sm:pt-8 pb-12 px-4 sm:px-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-md-outline/15">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-md-primary/10 text-md-primary">
              Direct Disbursement
            </span>
            <span className="text-xs text-md-on-surface-variant">Step 2 of 5</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-md-on-surface">
            Submit Beneficiary Bank Details
          </h1>
          <p className="text-xs sm:text-sm text-md-on-surface-variant mt-1">
            Provide your verified Malaysian bank account details to receive your compensation award.
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

      {/* Case Discovery & Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-1.5">
            <FileText size={14} className="text-md-primary" />
            <span>Target Acquisition Case</span>
          </label>
          {availableCases.length > 1 && (
            <span className="text-[11px] text-md-on-surface-variant">
              {availableCases.length} eligible cases found
            </span>
          )}
        </div>

        {loadingCases ? (
          <div className="h-24 rounded-xl bg-md-surface-container animate-pulse border border-md-outline/15 flex items-center justify-center text-xs text-md-on-surface-variant">
            Discovering member acquisition cases...
          </div>
        ) : availableCases.length > 1 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableCases.map((c) => {
              const isSelected = c.caseId === selectedCaseId;
              return (
                <button
                  type="button"
                  key={c.caseId}
                  onClick={() => handleCaseSelect(c.caseId)}
                  className={`text-left p-4 rounded-xl border transition-all duration-200 ease-md-bouncy ${
                    isSelected
                      ? 'bg-md-primary/5 border-md-primary shadow-sm ring-2 ring-md-primary/20'
                      : 'bg-md-surface-container-low border-md-outline/15 hover:border-md-outline/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-md-primary">
                      {c.caseId}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${getMemberDisplayStatus(c.status).badgeClass}`}>
                      {getMemberDisplayStatus(c.status).label}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-md-on-surface truncate">
                    {c.projectName}
                  </div>
                  <div className="text-[11px] text-md-on-surface-variant mb-2">
                    {c.lotNo}
                  </div>
                  <div className="text-xs font-bold text-md-on-surface">
                    Award: RM {c.amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </div>
                </button>
              );
            })}
          </div>
        ) : activeCase ? (
          <div className="p-4 rounded-xl bg-md-surface-container-low border border-md-outline/15 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-md-primary">
                  {activeCase.caseId}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${getMemberDisplayStatus(activeCase.status).badgeClass}`}>
                  {getMemberDisplayStatus(activeCase.status).label}
                </span>
              </div>
              <div className="text-xs font-semibold text-md-on-surface mt-1">
                {activeCase.projectName}
              </div>
              <div className="text-[11px] text-md-on-surface-variant">
                {activeCase.lotNo}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-md-on-surface-variant block">
                Compensation Award
              </span>
              <span className="text-base font-bold text-md-on-surface">
                RM {activeCase.amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-md-surface-container border border-md-outline/15 text-center space-y-2">
            <AlertCircle size={24} className="text-amber-600 mx-auto" />
            <h3 className="text-sm font-bold text-md-on-surface">No Eligible Cases Found</h3>
            <p className="text-xs text-md-on-surface-variant max-w-sm mx-auto">
              There are currently no land acquisition cases requiring bank details submission for your account ({user?.name || user?.email}).
            </p>
          </div>
        )}
      </div>

      {/* If Case Bank Details already submitted & verified, show locked status banner */}
      {isCaseSubmissionLocked ? (
        <div className="bg-md-surface-container border border-emerald-500/30 rounded-xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={28} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300/40">
                  Bank Details Submitted & Verified
                </span>
                <span className="font-mono text-xs font-bold text-md-primary">
                  {activeCase?.caseId}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-md-on-surface">
                Disbursement Details Already Recorded
              </h2>
              <p className="text-xs sm:text-sm text-md-on-surface-variant leading-relaxed">
                Bank details for Case <span className="font-mono font-bold text-md-on-surface">{activeCase?.caseId}</span> have already been submitted and verified under{' '}
                <span className="font-semibold text-md-on-surface">
                  {activeCase?.bankName || 'Maybank'} •••• {activeCase?.accountNumber ? activeCase.accountNumber.slice(-4) : '••••'}
                </span>
                . You cannot submit again while payment is in progress.
              </p>
            </div>
          </div>

          <div className="bg-md-surface-container-low rounded-xl p-4 border border-md-outline/10 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-md-on-surface-variant block">Target Acquisition</span>
                <span className="font-semibold text-md-on-surface">{activeCase?.projectName}</span>
              </div>
              <div>
                <span className="text-md-on-surface-variant block">Disbursement Account</span>
                <span className="font-semibold text-md-on-surface font-mono">
                  {activeCase?.bankName || 'Registered'} •••• {activeCase?.accountNumber ? activeCase.accountNumber.slice(-4) : '••••'}
                </span>
              </div>
              <div>
                <span className="text-md-on-surface-variant block">Payment Milestone</span>
                <span className="font-semibold text-emerald-700">
                  {activeCase ? getMemberDisplayStatus(activeCase.status).label : 'Payment In Progress'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="text"
              onClick={() => navigate('/member')}
              className="w-full sm:w-auto"
            >
              <ArrowLeft size={16} />
              <span>Back to Overview</span>
            </Button>
            <Button
              type="button"
              variant="filled"
              onClick={() => navigate(`/member/payment-status?caseId=${encodeURIComponent(activeCase?.caseId || '')}`)}
              className="w-full sm:w-auto"
            >
              <span>Track Payment Status</span>
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Saved Bank Accounts Preference Section */}
          {savedAccounts.length > 0 && (
            <div className="bg-md-surface-container border border-md-outline/15 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span>Payout Account Preference</span>
                </label>
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200/50">
                  {savedAccounts.length} Verified Account Saved
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAccountChoice('saved');
                    applySaved(savedAccounts[selectedSavedIndex]);
                  }}
                  className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                    accountChoice === 'saved'
                      ? 'bg-emerald-500/10 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                      : 'bg-md-surface-container-low border-md-outline/15 hover:border-md-outline/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={16} className={accountChoice === 'saved' ? 'text-emerald-600' : 'text-md-on-surface-variant'} />
                    <span className="text-xs font-bold text-md-on-surface">Use Saved Verified Bank Account</span>
                  </div>
                  <div className="text-xs text-md-on-surface font-semibold font-mono">
                    {savedAccounts[selectedSavedIndex]?.bankName} •••• {savedAccounts[selectedSavedIndex]?.accountNumber?.slice(-4)}
                  </div>
                  <div className="text-[11px] text-md-on-surface-variant mt-0.5">
                    Holder: {savedAccounts[selectedSavedIndex]?.accountHolderName}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAccountChoice('new');
                    setAccountNumber('');
                  }}
                  className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                    accountChoice === 'new'
                      ? 'bg-md-primary/5 border-md-primary shadow-sm ring-2 ring-md-primary/20'
                      : 'bg-md-surface-container-low border-md-outline/15 hover:border-md-outline/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard size={16} className={accountChoice === 'new' ? 'text-md-primary' : 'text-md-on-surface-variant'} />
                    <span className="text-xs font-bold text-md-on-surface">Enter New Bank Account</span>
                  </div>
                  <div className="text-[11px] text-md-on-surface-variant leading-relaxed">
                    Provide a different bank account for this specific compensation case.
                  </div>
                </button>
              </div>

              {accountChoice === 'saved' && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <Lock size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Using verified saved bank account from previous submission. Form inputs are locked to prevent errors. Choose &quot;Enter New Bank Account&quot; to change.</span>
                </div>
              )}
            </div>
          )}

          {/* Important Notice */}
          <div className="p-4 rounded-xl bg-md-surface-container border border-md-outline/15 flex items-start gap-3">
            <Info size={18} className="text-md-primary shrink-0 mt-0.5" />
            <div className="text-xs text-md-on-surface-variant leading-relaxed">
              <span className="font-semibold text-md-on-surface">Statutory Verification Invariant: </span>
              Per government audit standards, the beneficiary bank account holder name and MyKad / NRIC number must match the registered landowner details on the gazetted land acquisition title.
            </div>
          </div>

          {/* Main Bank Details Form */}
          <form onSubmit={handleSubmit} className="bg-md-surface-container border border-md-outline/15 rounded-xl p-5 sm:p-7 shadow-sm space-y-5">
            <h2 className="text-sm sm:text-base font-bold text-md-on-surface flex items-center gap-2">
              <Landmark size={18} className="text-md-primary" />
              <span>Banking Institution & Account Specification</span>
            </h2>

            {/* Bank Dropdown */}
            <div>
              <Select
                label="Malaysian Bank Institution"
                options={MALAYSIAN_BANKS}
                value={bankName}
                onChange={(val) => {
                  if (accountChoice === 'saved') return;
                  setBankName(val);
                  if (errors.bankName) setErrors((prev) => ({ ...prev, bankName: '' }));
                }}
                placeholder="Select your commercial bank..."
                error={errors.bankName}
                disabled={submitting || accountChoice === 'saved'}
              />
              <p className="text-[11px] text-md-on-surface-variant mt-1 px-1">
                Accepts all central bank (Bank Negara Malaysia) licensed commercial and Islamic banks.
              </p>
            </div>

            {/* Account Number */}
            <Input
              label="Bank Account Number"
              name="accountNumber"
              type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value);
                if (errors.accountNumber) setErrors((prev) => ({ ...prev, accountNumber: '' }));
              }}
              placeholder="e.g. 114012345678"
              error={errors.accountNumber}
              required
              disabled={submitting || accountChoice === 'saved'}
              readOnly={accountChoice === 'saved'}
              className="font-mono"
            />

            {/* Pre-filled Account Holder Name & MyKad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Registered Account Holder Full Name"
                name="accountHolderName"
                type="text"
                value={accountHolderName}
                onChange={(e) => {
                  setAccountHolderName(e.target.value);
                  if (errors.accountHolderName) setErrors((prev) => ({ ...prev, accountHolderName: '' }));
                }}
                placeholder="Full Name as per MyKad / Bank Book"
                error={errors.accountHolderName}
                required
                disabled={submitting || accountChoice === 'saved'}
                readOnly={accountChoice === 'saved'}
              />

              <div>
                <Input
                  label="MyKad / Identification Number"
                  name="myKadNumber"
                  type="text"
                  value={effectiveMyKad}
                  readOnly={true}
                  disabled={true}
                  className="font-mono"
                  suffix={<Lock size={14} />}
                  required
                />
                <p className="text-[11px] text-md-on-surface-variant mt-1 flex items-center gap-1">
                  <Lock size={12} className="text-md-primary shrink-0" />
                  <span>Verified citizen identification number (Immutable)</span>
                </p>
              </div>
            </div>

            {/* Phone Number */}
            <Input
              label="Contact Mobile Number (For SMS Notification)"
              name="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. +60123456789"
              disabled={submitting || accountChoice === 'saved'}
              readOnly={accountChoice === 'saved'}
              className="font-mono"
            />

            {/* Consent Checkbox with MD3 Checkbox Component */}
            <div className="pt-2">
              <Checkbox
                label="I hereby declare that this bank account is currently active, legally owned by me, and registered under my official MyKad NRIC. I authorize the Fair Compensation & Resettlement governance system to execute compensation disbursement directly to this account."
                checked={consentDeclared}
                onChange={(e) => {
                  setConsentDeclared(e.target.checked);
                  if (errors.consent) setErrors((prev) => ({ ...prev, consent: '' }));
                }}
              />
              {errors.consent && (
                <p className="text-xs text-md-error font-medium mt-1.5 pl-8">
                  {errors.consent}
                </p>
              )}
            </div>

            {/* Action Buttons (Cancel / Confirm) */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-md-outline/10">
              <Button
                type="button"
                variant="text"
                onClick={() => navigate('/member')}
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                <ArrowLeft size={16} />
                <span>Cancel</span>
              </Button>

              <Button
                type="submit"
                variant="filled"
                disabled={!isFormValid || submitting}
                className="w-full sm:w-auto"
              >
                {submitting ? (
                  <span>Submitting Bank Details...</span>
                ) : (
                  <>
                    <CreditCard size={16} />
                    <span>Submit Bank Details</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
