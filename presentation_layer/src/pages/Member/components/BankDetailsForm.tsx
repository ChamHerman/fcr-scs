import React, { useState, useEffect } from 'react';
import {
  Landmark,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Info,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { paymentApi } from '../../../services/paymentApi';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Select, type SelectOption } from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { ConfirmSubmitModal, ConfirmRow } from '../../../components/member/ConfirmSubmitModal';
import '../../Payment/payment.css';

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

export interface BankDetailsFormProps {
  caseId: string;
  caseInfo?: { projectName?: string; lotNo?: string; amount?: number } | null;
  /** Called after a successful submission so the parent can refresh status. */
  onSubmitted: () => void;
}

/**
 * FR-008/010/016: the beneficiary bank details submission form. Embedded
 * directly in the member payment-status page while the workflow sits at
 * step 2 (Bank Details Pending / New Bank Details Pending). Offers the
 * member's saved default payout account (FR-016) or a fresh entry, and gates
 * the actual submission behind a second confirmation (FR-017).
 */
// Normalizes Malaysian contact number by stripping leading +60, 60, or 0
export const normalizeContactNumber = (raw?: string | null): string => {
  if (!raw) return '';
  let cleaned = String(raw).trim().replace(/[\s-]/g, '');
  if (cleaned.startsWith('+60')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('60')) {
    cleaned = cleaned.slice(2);
  }
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned.replace(/\D/g, '');
};

export const BankDetailsForm: React.FC<BankDetailsFormProps> = ({ caseId, caseInfo, onSubmitted }) => {
  const { user } = useAuth();
  const { notify } = useNotification();

  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<any[]>([]);
  const [accountChoice, setAccountChoice] = useState<'saved' | 'new'>('new');

  // Form State
  const [bankName, setBankName] = useState<string>('Maybank');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [consentDeclared, setConsentDeclared] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const effectiveMyKad = (user?.identificationNumber || '').trim();

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const savedRes = await paymentApi.getSavedBankDetails();
        const accounts = savedRes.savedAccounts || [];
        if (isMounted && accounts.length > 0) {
          setSavedAccounts(accounts);
          setAccountChoice('saved');
          applySaved(accounts[0]);
        }
      } catch {}
    })();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-fill user profile fields
  useEffect(() => {
    if (user?.name) setAccountHolderName((prev) => prev || user.name || '');
    if (user?.contactNumber) setPhoneNumber((prev) => prev || normalizeContactNumber(user.contactNumber));
  }, [user]);

  const applySaved = (acc: any) => {
    if (!acc) return;
    setBankName(acc.bankName || 'Maybank');
    setAccountNumber(acc.accountNumber || '');
    if (acc.accountHolderName) setAccountHolderName(acc.accountHolderName);
    if (acc.phoneNumber) setPhoneNumber(normalizeContactNumber(acc.phoneNumber));
  };

  const isFormValid = Boolean(
    caseId &&
      bankName &&
      accountNumber &&
      accountNumber.replace(/[^0-9]/g, '').length >= 6 &&
      accountHolderName.trim().length > 0 &&
      effectiveMyKad.length > 0 &&
      consentDeclared
  );

  const validate = () => {
    const errs: Record<string, string> = {};
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

  // First confirmation: the form's Submit button validates and opens the
  // review dialog. The dialog's Confirm performs the actual submission.
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      notify({
        type: 'error',
        title: 'Form Validation Error',
        message: 'Please resolve the highlighted fields before submitting.',
      });
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmedSubmit = async () => {
    setSubmitting(true);
    try {
      const cleanPhone = normalizeContactNumber(phoneNumber);
      const phoneToSubmit = cleanPhone ? `+60${cleanPhone}` : '';

      await paymentApi.submitBankDetails({
        caseId,
        bankName,
        accountNumber: accountNumber.trim(),
        accountHolderName: accountHolderName.trim(),
        myKadNumber: effectiveMyKad,
        phoneNumber: phoneToSubmit,
      });

      // FR-016 flow 1: keep the default payout account in sync (backend also
      // persists this server-side; the call keeps legacy endpoints updated).
      await paymentApi
        .saveDefaultBankDetails({
          bankName,
          accountNumber: accountNumber.trim(),
          accountHolderName: accountHolderName.trim(),
          myKadNumber: effectiveMyKad,
          phoneNumber: phoneToSubmit,
        })
        .catch(() => {});

      notify({
        type: 'success',
        title: 'Bank Details Submitted',
        message: 'Your banking details have been securely recorded and queued for verification.',
      });
      setShowConfirm(false);
      onSubmitted();
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

  return (
    <div id="bank-details-form" className="space-y-4">
      {/* Saved Bank Accounts Preference Section (FR-016) */}
      {savedAccounts.length > 0 && (
        <div className="bg-md-surface-container border border-md-outline/15 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>Payout Account Preference</span>
            </label>
            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200/50">
              Default Account Saved
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setAccountChoice('saved');
                applySaved(savedAccounts[0]);
              }}
              className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                accountChoice === 'saved'
                  ? 'bg-emerald-500/10 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                  : 'bg-md-surface-container-low border-md-outline/15 hover:border-md-outline/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={16} className={accountChoice === 'saved' ? 'text-emerald-600' : 'text-md-on-surface-variant'} />
                <span className="text-xs font-bold text-md-on-surface">Use My Saved Default Account</span>
              </div>
              <div className="text-xs text-md-on-surface font-semibold font-mono">
                {savedAccounts[0]?.bankName} •••• {savedAccounts[0]?.accountNumber?.slice(-4)}
              </div>
              <div className="text-[11px] text-md-on-surface-variant mt-0.5">
                Holder: {savedAccounts[0]?.accountHolderName}
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
                <span className="text-xs font-bold text-md-on-surface">Enter Another Bank Account</span>
              </div>
              <div className="text-[11px] text-md-on-surface-variant leading-relaxed">
                Provide a different bank account for this specific compensation case.
              </div>
            </button>
          </div>

          {accountChoice === 'saved' && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <Lock size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Using your saved default payout account. Form inputs are locked to prevent errors. Choose &quot;Enter Another Bank Account&quot; to change.</span>
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
      <form onSubmit={handleFormSubmit} className="bg-md-surface-container border border-md-outline/15 rounded-xl p-5 sm:p-7 shadow-sm space-y-5">
        <h2 className="text-sm sm:text-base font-bold text-md-on-surface flex items-center gap-2">
          <Landmark size={18} className="text-md-primary" />
          <span>Submit Beneficiary Bank Details</span>
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
          inputMode="numeric"
          autoComplete="tel-national"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(normalizeContactNumber(e.target.value))}
          placeholder="172178475"
          prefix="+60"
          aria-label="Contact Mobile Number, country code +60"
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

        {/* Action Button — opens the FR-017 confirmation dialog */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-md-outline/10">
          <Button
            type="submit"
            variant="filled"
            disabled={!isFormValid || submitting}
            className="w-full sm:w-auto"
          >
            <CreditCard size={16} />
            <span>Submit Bank Details</span>
          </Button>
        </div>
      </form>

      {/* FR-017 second confirmation */}
      <ConfirmSubmitModal
        isOpen={showConfirm}
        title="Confirm Bank Details Submission"
        loading={submitting}
        confirmLabel="Confirm & Submit"
        onConfirm={handleConfirmedSubmit}
        onCancel={() => setShowConfirm(false)}
        summary={
          <>
            <ConfirmRow label="Case" value={caseId} mono />
            {caseInfo?.projectName && <ConfirmRow label="Project" value={caseInfo.projectName} />}
            <ConfirmRow label="Bank" value={bankName} />
            <ConfirmRow
              label="Account Number"
              value={accountNumber.trim()}
              mono
            />
            <ConfirmRow label="Account Holder" value={accountHolderName.trim()} />
            <ConfirmRow label="MyKad" value={effectiveMyKad} mono />
            {phoneNumber.trim() && (
              <ConfirmRow
                label="Phone"
                value={`+60 ${normalizeContactNumber(phoneNumber)}`}
                mono
              />
            )}
          </>
        }
      />
    </div>
  );
};
