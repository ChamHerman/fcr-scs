import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  Landmark, 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2, 
  Save, 
  CreditCard, 
  Info, 
  Lock,
  Phone,
  Mail,
  FileBadge,
  AlertCircle,
  Hash
} from 'lucide-react';
import gsap from 'gsap';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../hooks/useRole';
import { useNotification } from '../../components/ui/NotificationSystem';
import { paymentApi } from '../../services/paymentApi';
import { formatLocalContactNumber } from './components/BankDetailsForm';
import { 
  SUPPORTED_MALAYSIAN_BANKS, 
  getBankRule, 
  validateBankAccNumber,
  isAccountAttributionError,
  ACCOUNT_ATTRIBUTION_HINT,
} from './components/bankValidation';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Select, type SelectOption } from '../../components/ui/Select';
import { ConfirmSubmitModal, ConfirmRow } from '../../components/member/ConfirmSubmitModal';

const MALAYSIAN_BANKS: SelectOption[] = SUPPORTED_MALAYSIAN_BANKS.map((b) => ({
  value: b.key,
  label: b.name,
}));

export const MemberSettings: React.FC = () => {
  const { user } = useAuth();
  const { userName, identificationNumber } = useRole();
  const { notify } = useNotification();

  const [activeTab, setActiveTab] = useState<'banking' | 'profile'>('banking');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedAccounts, setSavedAccounts] = useState<any[]>([]);

  // Form State for default payout bank details
  const [bankName, setBankName] = useState<string>('Maybank');
  const [accountNumber, setAccountNumber] = useState<string>('');
  // Server-side rejection of the number itself (already attributed to another
  // beneficiary), kept separate from local format validation.
  const [serverAccountError, setServerAccountError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>(formatLocalContactNumber(user?.contactNumber));
  
  // Real-time interaction tracking
  const [accountTouched, setAccountTouched] = useState<boolean>(false);
  const [phoneTouched, setPhoneTouched] = useState<boolean>(false);

  const accInputRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLDivElement>(null);
  const phoneInputRef = useRef<HTMLDivElement>(null);
  const validationCardRef = useRef<HTMLDivElement>(null);

  const [showSaveConfirm, setShowSaveConfirm] = useState<boolean>(false);

  // Locked to the registered profile identity, mirroring effectiveMyKad: bank
  // verification assumes the IC name and the account holder name are the same
  // person, so the member must not be able to type a different one.
  const effectiveHolderName = (user?.name || userName || '').trim();
  const hasProfileName = effectiveHolderName.length > 0;

  const effectiveMyKad = (user?.identificationNumber || identificationNumber || '').trim();

  useEffect(() => {
    let isMounted = true;
    async function loadSaved() {
      setLoading(true);
      try {
        const res = await paymentApi.getSavedBankDetails();
        const list = res.savedAccounts || [];
        if (isMounted) {
          setSavedAccounts(list);
          if (list.length > 0) {
            const acc = list[0];
            setBankName(acc.bankName || 'Maybank');
            setAccountNumber(acc.accountNumber || '');
            if (acc.phoneNumber) setPhoneNumber(formatLocalContactNumber(acc.phoneNumber));
            setServerAccountError(null);
          }
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadSaved();
    return () => { isMounted = false; };
  }, []);

  // Pre-fill contact number from the profile. The holder name is locked to the
  // registered name (see effectiveHolderName), so it is never editable state.
  useEffect(() => {
    if (user?.contactNumber) setPhoneNumber((prev) => prev || formatLocalContactNumber(user.contactNumber));
  }, [user]);

  // Bank rule and real-time account validation
  const currentBankRule = useMemo(() => getBankRule(bankName), [bankName]);
  const accValidation = useMemo(
    () => validateBankAccNumber(bankName, accountNumber),
    [bankName, accountNumber]
  );

  // Real-time error conditions. A server rejection of the number itself wins
  // over the local format state, so the green card cannot mask it.
  const showServerAccountError = Boolean(serverAccountError);
  const showAccountError = !showServerAccountError && accountTouched && !accValidation.isValid;
  const showAccountSuccess = !showServerAccountError && accountTouched && accValidation.isValid;
  const showNameError = !hasProfileName;
  const showPhoneError = phoneTouched && (!phoneNumber.trim() || phoneNumber.trim().replace(/\D/g, '').length < 9);

  // Form validity gate — all fields required (no checkboxes for default settings)
  const isFormValid = Boolean(
    bankName &&
      accValidation.isValid &&
      hasProfileName &&
      effectiveMyKad.length > 0 &&
      phoneNumber.trim().replace(/\D/g, '').length >= 9
  );

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

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountTouched(true);
    setPhoneTouched(true);

    let hasError = false;
    if (!accValidation.isValid) {
      triggerShake(accInputRef);
      hasError = true;
    }
    if (!hasProfileName) {
      triggerShake(nameInputRef);
      hasError = true;
    }
    if (!phoneNumber.trim() || phoneNumber.trim().replace(/\D/g, '').length < 9) {
      triggerShake(phoneInputRef);
      hasError = true;
    }

    if (hasError || !isFormValid) {
      notify({
        type: 'error',
        title: 'Validation Incomplete',
        message: 'Please fulfill all required bank account criteria before saving.',
      });
      return;
    }
    setShowSaveConfirm(true);
  };

  const handleConfirmedSave = async () => {
    setSaving(true);
    try {
      const phoneToSubmit = formatLocalContactNumber(phoneNumber);
      await paymentApi.saveDefaultBankDetails({
        bankName,
        accountNumber: accValidation.cleanedValue,
        accountHolderName: effectiveHolderName,
        myKadNumber: effectiveMyKad,
        phoneNumber: phoneToSubmit,
      });

      notify({
        type: 'success',
        title: 'Banking Profile Updated',
        message: 'Your default disbursement bank account has been saved and verified for all future compensation cases.',
      });
      setShowSaveConfirm(false);

      // Reload saved
      const res = await paymentApi.getSavedBankDetails();
      setSavedAccounts(res.savedAccounts || []);
    } catch (err: any) {
      const message = err.message || 'Could not save bank details.';
      if (isAccountAttributionError(message)) {
        // Dismiss the confirmation dialog so the flagged field is reachable.
        setShowSaveConfirm(false);
        setServerAccountError(ACCOUNT_ATTRIBUTION_HINT);
        triggerShake(accInputRef);
      }
      notify({
        type: 'error',
        title: 'Save Failed',
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pt-6 sm:pt-8 pb-12 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-md-outline/15">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-md-primary/10 text-md-primary">
              Account Configuration
            </span>
            <span className="text-xs text-md-on-surface-variant">Member Portal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-md-on-surface">
            Claimant Settings & Preferences
          </h1>
          <p className="text-xs sm:text-sm text-md-on-surface-variant mt-0.5">
            Manage your default verified disbursement bank account and personal profile records.
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-md-outline/15 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('banking')}
          className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
            activeTab === 'banking'
              ? 'bg-md-primary text-md-on-primary shadow-sm'
              : 'bg-md-surface-container text-md-on-surface-variant hover:bg-md-surface-container-low'
          }`}
        >
          <Landmark size={15} />
          <span>Payout Banking Settings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
            activeTab === 'profile'
              ? 'bg-md-primary text-md-on-primary shadow-sm'
              : 'bg-md-surface-container text-md-on-surface-variant hover:bg-md-surface-container-low'
          }`}
        >
          <User size={15} />
          <span>Landowner Identity Profile</span>
        </button>
      </div>

      {/* Tab 1: Banking Settings */}
      {activeTab === 'banking' && (
        <div className="space-y-6">
          {/* Saved Bank Account Card */}
          {savedAccounts.length > 0 && (
            <div className="bg-md-surface-container border border-emerald-500/30 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Currently Configured Payout Account</span>
                </div>
                <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-300/40">
                  Verified Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
                <div>
                  <span className="text-md-on-surface-variant block">Institution</span>
                  <span className="font-semibold text-md-on-surface text-sm">{savedAccounts[0]?.bankName}</span>
                </div>
                <div>
                  <span className="text-md-on-surface-variant block">Account Number</span>
                  <span className="font-mono font-semibold text-md-on-surface text-sm">
                    •••• {savedAccounts[0]?.accountNumber?.slice(-4)}
                  </span>
                </div>
                <div>
                  <span className="text-md-on-surface-variant block">Beneficiary Full Name</span>
                  <span className="font-semibold text-md-on-surface text-sm">{savedAccounts[0]?.accountHolderName}</span>
                </div>
              </div>
              <div className="text-[11px] text-md-on-surface-variant pt-1 border-t border-md-outline/10">
                This account is automatically offered as a 1-click option when submitting compensation bank details for any new land acquisition case.
              </div>
            </div>
          )}

          {/* Form to update or set default bank account */}
          <form
            onSubmit={handleSaveBankDetails}
            noValidate
            autoComplete="off"
            className="bg-md-surface-container border border-md-outline/15 rounded-xl p-5 sm:p-7 shadow-sm space-y-5"
          >
            <div>
              <h2 className="text-base font-bold text-md-on-surface flex items-center gap-2">
                <CreditCard size={18} className="text-md-primary" />
                <span>{savedAccounts.length > 0 ? 'Update Default Payout Account' : 'Set Up Default Payout Account'}</span>
              </h2>
              <p className="text-xs text-md-on-surface-variant mt-1">
                Configure your verified Malaysian banking account. Once saved, you can seamlessly select this account on any acquisition case without re-entering details.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-md-surface-container-low border border-md-outline/10 text-xs text-md-on-surface-variant flex items-start gap-2.5">
              <Info size={16} className="text-md-primary shrink-0 mt-0.5" />
              <span>
                Statutory award funds are disbursed via interbank electronic clearing. Account holder name must strictly match your registered MyKad name.
              </span>
            </div>

            {/* Bank Select */}
            <div>
              <Select
                label="Malaysian Bank Institution"
                requiredIndicator={true}
                options={MALAYSIAN_BANKS}
                value={bankName}
                onChange={(val) => {
                  setBankName(val);
                }}
                disabled={saving}
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
                name="fcr_default_account_num"
                id="fcr-default-account-num"
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
                disabled={saving}
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
                  The field's own error line above carries the instruction, so
                  this card adds only the reason. */}
              {showServerAccountError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 flex items-start gap-2 animate-in fade-in"
                >
                  <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-[11px]">
                    <strong>Why:</strong> each bank account may be registered to exactly one MyKad holder, so this number is already taken by someone else.
                  </p>
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

            {/* Locked Account Holder Name & Locked MyKad — both mirror the
                registered profile identity. */}
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
                      ? 'Complete your registered name in your profile before saving bank details.'
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

            {/* Contact Number (Replaced label, removed +60 prefix) */}
            <div ref={phoneInputRef}>
              <Input
                label="Contact Number"
                requiredIndicator={true}
                name="contactNumber"
                type="tel"
                inputMode="numeric"
                value={phoneNumber}
                onFocus={() => setPhoneTouched(true)}
                onBlur={() => setPhoneTouched(true)}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d-]/g, '');
                  setPhoneNumber(val);
                  setPhoneTouched(true);
                }}
                placeholder="0160365985"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                error={
                  showPhoneError
                    ? !phoneNumber.trim()
                      ? 'Contact number is required'
                      : 'Contact number requires at least 9 digits (e.g. 0160365985)'
                    : undefined
                }
                inputClassName={
                  showPhoneError
                    ? '!border-rose-500 !ring-2 !ring-rose-500/25 !text-rose-900 dark:!text-rose-100'
                    : ''
                }
                disabled={saving}
                className="font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-md-outline/10">
              <Button
                type="submit"
                variant="filled"
                disabled={!isFormValid || saving}
                className={`w-full sm:w-auto ${
                  !isFormValid || saving ? 'opacity-50 cursor-not-allowed !pointer-events-auto' : ''
                }`}
              >
                <Save size={16} />
                <span>Review & Save Default Payout Account</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Profile Overview */}
      {activeTab === 'profile' && (
        <div className="bg-md-surface-container border border-md-outline/15 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-4 pb-4 border-b border-md-outline/10">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xl shadow-md">
              {userName?.slice(0, 2).toUpperCase() || 'M1'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-md-on-surface">{userName || user?.name}</h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-md-secondary-container text-md-on-secondary-container">
                Affected Landowner (Claimant)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-md-surface-container-low border border-md-outline/10 space-y-1">
              <div className="flex items-center gap-1.5 text-md-on-surface-variant">
                <FileBadge size={14} />
                <span>MyKad / NRIC</span>
              </div>
              <div className="font-mono font-bold text-sm text-md-on-surface">
                {user?.identificationNumber || identificationNumber || '—'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-md-surface-container-low border border-md-outline/10 space-y-1">
              <div className="flex items-center gap-1.5 text-md-on-surface-variant">
                <Mail size={14} />
                <span>Email Address</span>
              </div>
              <div className="font-semibold text-sm text-md-on-surface">
                {user?.email || '—'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-md-surface-container-low border border-md-outline/10 space-y-1">
              <div className="flex items-center gap-1.5 text-md-on-surface-variant">
                <Phone size={14} />
                <span>Mobile Contact</span>
              </div>
              <div className="font-mono font-semibold text-sm text-md-on-surface">
                {formatLocalContactNumber(user?.contactNumber || phoneNumber) || '—'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-md-surface-container-low border border-md-outline/10 space-y-1">
              <div className="flex items-center gap-1.5 text-md-on-surface-variant">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Account Status</span>
              </div>
              <div className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                Active Verified Citizen
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmSubmitModal
        isOpen={showSaveConfirm}
        title="Confirm Default Payout Account"
        loading={saving}
        confirmLabel="Confirm & Save Default"
        onConfirm={handleConfirmedSave}
        onCancel={() => setShowSaveConfirm(false)}
        summary={
          <>
            <ConfirmRow label="Bank" value={currentBankRule?.name || bankName} />
            <ConfirmRow
              label="Account Number"
              value={accValidation.cleanedValue}
              mono
            />
            <ConfirmRow label="Account Holder" value={effectiveHolderName} />
            <ConfirmRow
              label="MyKad"
              value={effectiveMyKad}
              mono
            />
            {phoneNumber.trim() && (
              <ConfirmRow
                label="Contact Number"
                value={formatLocalContactNumber(phoneNumber.trim())}
                mono
              />
            )}
            <ConfirmRow
              label="Effect"
              value="Saved as your default payout account. Nothing is submitted to the admin portal until you submit bank details on a specific case."
            />
          </>
        }
      />
    </div>
  );
};
