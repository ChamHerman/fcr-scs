import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Landmark,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Info,
  AlertCircle,
  Hash,
} from 'lucide-react';
import gsap from 'gsap';
import { useAuth } from '../../../context/AuthContext';
import { paymentApi } from '../../../services/paymentApi';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Select, type SelectOption } from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import { useNotification } from '../../../components/ui/NotificationSystem';
import { ConfirmSubmitModal, ConfirmRow } from '../../../components/member/ConfirmSubmitModal';
import {
  SUPPORTED_MALAYSIAN_BANKS,
  getBankRule,
  validateBankAccNumber,
  isAccountAttributionError,
  ACCOUNT_ATTRIBUTION_HINT,
} from './bankValidation';
import '../../Payment/payment.css';

// 10 Standard Malaysian Commercial & Islamic Banks
const MALAYSIAN_BANKS: SelectOption[] = SUPPORTED_MALAYSIAN_BANKS.map((b) => ({
  value: b.key,
  label: b.name,
}));

export interface BankDetailsFormProps {
  caseId: string;
  caseInfo?: { projectName?: string; lotNo?: string; amount?: number } | null;
  /** Called after a successful submission so the parent can refresh status. */
  onSubmitted: () => void;
}

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

/**
 * Normalizes Malaysian contact number to local standard without +60 prefix
 * e.g. "+60160365985" -> "0160365985"
 */
export const formatLocalContactNumber = (raw?: string | null): string => {
  if (!raw) return '';
  let cleaned = String(raw).trim().replace(/[\s-]/g, '');
  if (cleaned.startsWith('+60')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('+6')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('60')) {
    cleaned = cleaned.slice(2);
  }
  if (!cleaned.startsWith('0') && cleaned.length > 0) {
    cleaned = `0${cleaned}`;
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

  // Contact number is locked to the registered profile — never manually entered.
  const phoneNumber = formatLocalContactNumber(user?.contactNumber);
  const hasProfilePhone = phoneNumber.trim().replace(/\D/g, '').length >= 9;

  // Interaction tracking for real-time validation responses
  const [accountTouched, setAccountTouched] = useState<boolean>(false);
  const [checkboxTouched, setCheckboxTouched] = useState<boolean>(false);

  // Split consent checkboxes
  const [consentActiveOwned, setConsentActiveOwned] = useState<boolean>(false);
  const [consentDisbursement, setConsentDisbursement] = useState<boolean>(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  // Server-side rejection of the account number itself (already attributed to
  // another beneficiary). Kept separate from local format validation so the
  // green "valid format" state cannot mask it.
  const [serverAccountError, setServerAccountError] = useState<string | null>(null);

  const accInputRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLDivElement>(null);
  const phoneInputRef = useRef<HTMLDivElement>(null);
  const checkboxGroupRef = useRef<HTMLDivElement>(null);
  const validationCardRef = useRef<HTMLDivElement>(null);

  // Automated bank verification assumes the registered IC name and the bank
  // account holder name belong to the same person, so the name is derived from
  // the profile and locked — mirroring effectiveMyKad below. The backend
  // re-derives it from the session user, so a client cannot substitute another
  // beneficiary's name.
  const effectiveHolderName = (user?.name || '').trim();
  const hasProfileName = effectiveHolderName.length > 0;

  const effectiveMyKad = (user?.identificationNumber || '').trim();

  // Load saved payout accounts
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

  const applySaved = (acc: any) => {
    if (!acc) return;
    setBankName(acc.bankName || 'Maybank');
    setAccountNumber(acc.accountNumber || '');
    setServerAccountError(null);
  };

  // Bank rule and real-time account validation
  const currentBankRule = useMemo(() => getBankRule(bankName), [bankName]);
  const accValidation = useMemo(
    () => validateBankAccNumber(bankName, accountNumber),
    [bankName, accountNumber]
  );

  // Real-time error conditions. A server rejection of the number itself wins
  // over the local format state, so the green "valid format" card can never
  // sit under an account the backend has refused.
  const showServerAccountError = Boolean(serverAccountError);
  const showAccountError = !showServerAccountError && accountTouched && !accValidation.isValid;
  const showAccountSuccess = !showServerAccountError && accountTouched && accValidation.isValid;
  const showNameError = !hasProfileName;
  const showPhoneError = !hasProfilePhone;
  const showCheckbox1Error = checkboxTouched && !consentActiveOwned;
  const showCheckbox2Error = checkboxTouched && !consentDisbursement;

  // Form validity gate — all fields and both checkboxes required
  const isFormValid = Boolean(
    caseId &&
      bankName &&
      accValidation.isValid &&
      hasProfileName &&
      effectiveMyKad.length > 0 &&
      hasProfilePhone &&
      consentActiveOwned &&
      consentDisbursement
  );

  // GSAP micro-interaction: subtle shake on invalid entry
  const triggerShake = (targetRef: React.RefObject<HTMLDivElement | null>) => {
    if (targetRef.current) {
      gsap.fromTo(
        targetRef.current,
        { x: -5 },
        {
          x: 0,
          duration: 0.35,
          ease: 'elastic.out(1, 0.3)',
          clearProps: 'transform',
        }
      );
    }
  };

  const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/[^\d\s-]/.test(val)) {
      triggerShake(accInputRef);
    }
    setAccountNumber(val);
    setAccountTouched(true);
    setServerAccountError(null);
  };

  const validate = () => {
    setAccountTouched(true);
    setCheckboxTouched(true);

    let hasError = false;
    if (!accValidation.isValid) {
      triggerShake(accInputRef);
      hasError = true;
    }
    if (!hasProfileName) {
      triggerShake(nameInputRef);
      hasError = true;
    }
    if (!hasProfilePhone) {
      triggerShake(phoneInputRef);
      hasError = true;
    }
    if (!consentActiveOwned || !consentDisbursement) {
      triggerShake(checkboxGroupRef);
      hasError = true;
    }

    return !hasError && isFormValid;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      notify({
        type: 'error',
        title: 'Validation Incomplete',
        message: 'Please fulfill all required bank account criteria before submitting.',
      });
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmedSubmit = async () => {
    setSubmitting(true);
    try {
      // Submitted phone number is local format only (e.g. 011111111), no +60 or +6 in front
      const phoneToSubmit = formatLocalContactNumber(phoneNumber);

      await paymentApi.submitBankDetails({
        caseId,
        bankName,
        accountNumber: accValidation.cleanedValue,
        accountHolderName: effectiveHolderName,
        myKadNumber: effectiveMyKad,
        phoneNumber: phoneToSubmit,
        isAnotherAccount: accountChoice === 'new' && savedAccounts.length > 0,
      });

      notify({
        type: 'success',
        title: 'Bank Details Submitted',
        message: 'Your banking details have been securely recorded and verified.',
      });
      setShowConfirm(false);
      onSubmitted();
    } catch (err: any) {
      const message = err.message || 'Unable to submit bank details. Please try again.';
      if (isAccountAttributionError(message)) {
        // Dismiss the confirmation dialog so the flagged field is reachable and
        // the member can correct the number without reopening anything.
        setShowConfirm(false);
        setServerAccountError(ACCOUNT_ATTRIBUTION_HINT);
        triggerShake(accInputRef);
      }
      notify({
        type: 'error',
        title: 'Submission Failed',
        message,
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
                setAccountTouched(false);
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
      <form
        onSubmit={handleFormSubmit}
        noValidate
        autoComplete="off"
        className="bg-md-surface-container border border-md-outline/15 rounded-xl p-5 sm:p-7 shadow-sm space-y-5"
      >
        <h2 className="text-sm sm:text-base font-bold text-md-on-surface flex items-center gap-2">
          <Landmark size={18} className="text-md-primary" />
          <span>Submit Beneficiary Bank Details</span>
        </h2>

        {/* Bank Dropdown */}
        <div>
          <Select
            label="Malaysian Bank Institution"
            requiredIndicator={true}
            options={MALAYSIAN_BANKS}
            value={bankName}
            onChange={(val) => {
              if (accountChoice === 'saved') return;
              setBankName(val);
              setServerAccountError(null);
            }}
            placeholder="Select your commercial bank..."
            error={errors.bankName}
            disabled={submitting || accountChoice === 'saved'}
          />
          <p className="text-[11px] text-md-on-surface-variant mt-1 px-1">
            Accepts all central bank (Bank Negara Malaysia) licensed commercial and Islamic banks.
          </p>
        </div>

        {/* Bank Account Number with Interactive Validation UI */}
        <div ref={accInputRef} className="space-y-1.5">
          <Input
            label="Bank Account Number"
            requiredIndicator={true}
            name="fcr_beneficiary_account_num"
            id="fcr-beneficiary-account-num"
            type="text"
            inputMode="numeric"
            value={accountNumber}
            onFocus={() => setAccountTouched(true)}
            onBlur={() => setAccountTouched(true)}
            onChange={handleAccountChange}
            placeholder={currentBankRule?.placeholder || 'e.g. 114012345678'}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-lpignore="true"
            data-form-type="other"
            disabled={submitting || accountChoice === 'saved'}
            readOnly={accountChoice === 'saved'}
            className="font-mono"
            error={
              showServerAccountError
                ? serverAccountError!
                : showAccountError
                ? accValidation.statusMessage
                : undefined
            }
            inputClassName={
              showServerAccountError || showAccountError
                ? '!border-rose-500 !ring-2 !ring-rose-500/25 !text-rose-900 dark:!text-rose-100'
                : showAccountSuccess
                ? '!border-emerald-500 !ring-1 !ring-emerald-500/30'
                : ''
            }
          />

          {/* Server refused this number — it belongs to another beneficiary.
              The field's own error line above already carries the instruction,
              so this card adds only the reason, never a repeat of it. */}
          {showServerAccountError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 flex items-start gap-2 animate-in fade-in"
            >
              <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-[11px] space-y-1">
                <p>
                  <strong>Why:</strong> each bank account may be registered to exactly one MyKad holder, so this number is already taken by someone else.
                </p>
                {accountChoice === 'saved' && (
                  <p>
                    Choose &quot;Enter Another Bank Account&quot; above to type a different number — the field is locked while a saved account is selected.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Interactive State Feedback Box */}
          {showAccountError && (
            <div
              ref={validationCardRef}
              className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 transition-all duration-200 space-y-2 animate-in fade-in"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
                  <span className="text-xs font-semibold">{accValidation.statusMessage}</span>
                </div>
                <div className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-700 dark:text-rose-300 font-mono text-[11px] font-bold">
                  <Hash size={12} />
                  <span>
                    {accValidation.currentLength}/{accValidation.targetLength}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-rose-800/80 dark:text-rose-300/80 pt-1 border-t border-rose-500/20">
                <span>
                  <strong>Condition:</strong> {accValidation.ruleMessage}
                </span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {accValidation.digitsLeft > 0
                    ? `${accValidation.digitsLeft} digits left to fulfill condition`
                    : 'Account format invalid'}
                </span>
              </div>
            </div>
          )}

          {showAccountSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2 text-xs font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Valid {currentBankRule?.key || bankName} online banking account format</span>
              </div>
              <span className="font-mono font-bold text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-300">
                {accValidation.currentLength} digits ✓
              </span>
            </div>
          )}
        </div>

        {/* Locked Account Holder Name & Locked MyKad — both mirror the registered
            profile identity; the backend re-derives them from the session user. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div ref={nameInputRef}>
            <Input
              label="Registered Account Holder Full Name"
              requiredIndicator={true}
              name="accountHolderName"
              type="text"
              value={effectiveHolderName}
              readOnly={true}
              disabled={true}
              autoComplete="off"
              placeholder="As per your registered MyKad name"
              error={
                showNameError
                  ? 'Complete your registered name in your profile before submitting bank details.'
                  : undefined
              }
              inputClassName={
                showNameError
                  ? '!border-rose-500 !ring-2 !ring-rose-500/25 !text-rose-900 dark:!text-rose-100'
                  : ''
              }
              suffix={<Lock size={14} />}
            />
          </div>

          <div>
            <Input
              label="MyKad / Identification Number"
              requiredIndicator={true}
              name="myKadNumber"
              type="text"
              value={effectiveMyKad}
              readOnly={true}
              disabled={true}
              autoComplete="off"
              className="font-mono"
              suffix={<Lock size={14} />}
            />
          </div>
        </div>

        {/* Contact Number — locked to the registered profile, mirroring the
            holder name and MyKad; the backend also re-derives it from the session user. */}
        <div ref={phoneInputRef}>
          <Input
            label="Contact Number"
            requiredIndicator={true}
            name="contactNumber"
            type="tel"
            inputMode="numeric"
            value={phoneNumber}
            placeholder="As per your registered profile"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            readOnly={true}
            disabled={true}
            error={
              showPhoneError
                ? 'No valid contact number on your profile. Update your profile before submitting bank details.'
                : undefined
            }
            inputClassName={
              showPhoneError
                ? '!border-rose-500 !ring-2 !ring-rose-500/25 !text-rose-900 dark:!text-rose-100'
                : ''
            }
            className="font-mono"
            suffix={<Lock size={14} />}
          />
        </div>

        {/* Split Consent Checkboxes */}
        <div
          ref={checkboxGroupRef}
          className={`pt-2 space-y-3 transition-colors p-3 rounded-xl ${
            showCheckbox1Error || showCheckbox2Error
              ? 'bg-rose-500/5 border border-rose-500/20'
              : ''
          }`}
        >
          <div>
            <Checkbox
              label="I hereby declare that this bank account is currently active, legally owned by me, and registered under my official MyKad NRIC. *"
              checked={consentActiveOwned}
              onChange={(e) => {
                setConsentActiveOwned(e.target.checked);
                setCheckboxTouched(true);
              }}
            />
            {showCheckbox1Error && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1.5 pl-8 animate-in fade-in">
                This declaration of active account ownership is required *
              </p>
            )}
          </div>

          <div>
            <Checkbox
              label="I authorize the Fair Compensation & Resettlement governance system to execute compensation disbursement directly to this account. *"
              checked={consentDisbursement}
              onChange={(e) => {
                setConsentDisbursement(e.target.checked);
                setCheckboxTouched(true);
              }}
            />
            {showCheckbox2Error && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1.5 pl-8 animate-in fade-in">
                Direct compensation disbursement authorization is required *
              </p>
            )}
          </div>
        </div>

        {/* Action Button — strictly disabled until all fields and conditions are satisfied */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-md-outline/10">
          <Button
            type="submit"
            variant="filled"
            disabled={!isFormValid || submitting}
            className={`w-full sm:w-auto ${
              !isFormValid || submitting ? 'opacity-50 cursor-not-allowed !pointer-events-auto' : ''
            }`}
          >
            <CreditCard size={16} />
            <span>Submit Bank Details</span>
          </Button>
        </div>
      </form>

      {/* FR-017 second confirmation dialog */}
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
            <ConfirmRow label="Bank" value={currentBankRule?.name || bankName} />
            <ConfirmRow
              label="Account Number"
              value={accValidation.cleanedValue}
              mono
            />
            <ConfirmRow label="Account Holder" value={effectiveHolderName} />
            <ConfirmRow label="MyKad" value={effectiveMyKad} mono />
            {phoneNumber.trim() && (
              <ConfirmRow
                label="Contact Number"
                value={phoneNumber.trim()}
                mono
              />
            )}
          </>
        }
      />
    </div>
  );
};
