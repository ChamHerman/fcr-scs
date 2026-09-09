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
import { useNotification } from '../../components/ui/NotificationSystem';

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

  // Form State
  const [bankName, setBankName] = useState<string>('Maybank');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  const [myKadNumber, setMyKadNumber] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [consentDeclared, setConsentDeclared] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Discover cases on load
  useEffect(() => {
    let isMounted = true;

    async function loadCases() {
      setLoadingCases(true);
      try {
        const res = await paymentApi.getAllCases();
        const cases: any[] = res.cases || [];

        // Format discovered cases
        const mapped: DiscoveredCase[] = cases.map((c) => ({
          caseId: c.caseId,
          projectName: c.caseId === 'LAC-2026-08-0003' 
            ? 'Desa Melati Flood Mitigation Project'
            : `Land Acquisition ${c.caseId}`,
          lotNo: c.caseId === 'LAC-2026-08-0003'
            ? 'Lot 3104, Mukim Setapak'
            : 'Lot Parcel',
          amount: Number(c.amount) || 0,
          status: c.status,
          bankName: c.bankName || undefined,
          accountNumber: c.accountNumber || undefined,
          accountHolderName: c.accountHolderName || undefined,
        }));

        if (isMounted) {
          if (mapped.length > 0) {
            setAvailableCases(mapped);
            // If requestedCaseId matches, pick it; otherwise pick first case needing bank details or first case
            const target = requestedCaseId 
              ? mapped.find((item) => item.caseId.toLowerCase() === requestedCaseId.toLowerCase())
              : mapped.find((item) => !item.bankName) || mapped[0];
            
            const picked = target || mapped[0];
            setSelectedCaseId(picked.caseId);
            if (picked.bankName) setBankName(picked.bankName);
            if (picked.accountNumber) setAccountNumber(picked.accountNumber);
          } else {
            // Seed default fallback case for displaced member
            const fallback: DiscoveredCase = {
              caseId: 'LAC-2026-08-0003',
              projectName: 'Desa Melati Flood Mitigation Project',
              lotNo: 'Lot 3104, Mukim Setapak',
              amount: 3200000,
              status: 'Offer Accepted',
            };
            setAvailableCases([fallback]);
            setSelectedCaseId(fallback.caseId);
          }
        }
      } catch {
        if (isMounted) {
          // Graceful fallback for offline / mock seed
          const fallback: DiscoveredCase = {
            caseId: requestedCaseId || 'LAC-2026-08-0003',
            projectName: 'Desa Melati Flood Mitigation Project',
            lotNo: 'Lot 3104, Mukim Setapak',
            amount: 3200000,
            status: 'Offer Accepted',
          };
          setAvailableCases([fallback]);
          setSelectedCaseId(fallback.caseId);
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
    if (!myKadNumber || myKadNumber.replace(/[^0-9]/g, '').length < 8) {
      errs.myKadNumber = 'Valid MyKad/NRIC number is required';
    }
    if (!consentDeclared) {
      errs.consent = 'You must declare the accuracy of these bank details';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        myKadNumber: myKadNumber.trim(),
        phoneNumber: phoneNumber.trim(),
      });

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
    <div className="max-w-3xl mx-auto space-y-6">
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
                      ? 'bg-md-primary/8 border-md-primary ring-2 ring-md-primary/30 shadow-sm'
                      : 'bg-md-surface-container border-md-outline/15 hover:bg-md-surface-container-low'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-md-primary">
                      {c.caseId}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-md-secondary-container text-md-on-secondary-container">
                      {c.status}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-md-on-surface truncate">
                    {c.projectName}
                  </div>
                  <div className="text-[11px] text-md-on-surface-variant mt-0.5">
                    {c.lotNo}
                  </div>
                  <div className="mt-2 text-xs font-bold text-md-on-surface">
                    Award: RM {c.amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </div>
                </button>
              );
            })}
          </div>
        ) : activeCase ? (
          /* Single Case Summary Card */
          <div className="bg-md-surface-container border border-md-outline/15 rounded-xl p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-md-outline/10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-md-primary">
                    {activeCase.caseId}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    {activeCase.status}
                  </span>
                </div>
                <p className="text-xs font-semibold text-md-on-surface mt-0.5">
                  {activeCase.projectName}
                </p>
              </div>

              <div className="sm:text-right">
                <span className="text-[10px] text-md-on-surface-variant uppercase tracking-wider block">
                  Compensation Award
                </span>
                <span className="text-base sm:text-lg font-bold text-md-primary">
                  RM {activeCase.amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="pt-3 flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-md-on-surface-variant">
              <span><strong>Parcel:</strong> {activeCase.lotNo}</span>
              <span><strong>Law:</strong> Land Acquisition Act 1960 (Form H)</span>
              <span><strong>Disbursement:</strong> Electronic Fund Transfer (EFT)</span>
            </div>
          </div>
        ) : null}
      </div>

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
              setBankName(val);
              if (errors.bankName) setErrors((prev) => ({ ...prev, bankName: '' }));
            }}
            placeholder="Select your commercial bank..."
            error={errors.bankName}
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
          disabled={submitting}
        />

        {/* Pre-filled Account Holder Name */}
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
            disabled={submitting}
          />

          <Input
            label="MyKad / Identification Number"
            name="myKadNumber"
            type="text"
            value={myKadNumber}
            onChange={(e) => {
              setMyKadNumber(e.target.value);
              if (errors.myKadNumber) setErrors((prev) => ({ ...prev, myKadNumber: '' }));
            }}
            placeholder="e.g. 850712-14-5567"
            error={errors.myKadNumber}
            required
            disabled={submitting}
          />
        </div>

        {/* Phone Number */}
        <Input
          label="Contact Mobile Number (For SMS Notification)"
          name="phoneNumber"
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="e.g. +60123456789"
          disabled={submitting}
        />

        {/* Consent Checkbox */}
        <div className="pt-2">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={consentDeclared}
              onChange={(e) => {
                setConsentDeclared(e.target.checked);
                if (errors.consent) setErrors((prev) => ({ ...prev, consent: '' }));
              }}
              className="mt-1 h-4 w-4 rounded border-md-outline/40 text-md-primary focus:ring-md-primary shrink-0"
            />
            <span className="text-xs text-md-on-surface leading-normal">
              I hereby declare that this bank account is currently active, legally owned by me, and registered under my official MyKad NRIC. I authorize the Fair Compensation & Resettlement governance system to execute compensation disbursement directly to this account.
            </span>
          </label>
          {errors.consent && (
            <p className="text-xs text-md-error font-medium mt-1.5 pl-7">
              {errors.consent}
            </p>
          )}
        </div>

        {/* Action Buttons (Cancel / Confirm order) */}
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
            disabled={submitting}
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
    </div>
  );
}
