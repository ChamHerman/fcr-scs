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
  Hash,
  KeyRound,
  Eye,
  EyeOff,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  MapPin,
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

/** Compute name initials: first letter of word[0] + first letter of word[1] */
function getNameInitials(name: string | undefined | null): string {
  if (!name) return 'AL';
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const second = words[1]?.[0] ?? '';
  return (first + second).toUpperCase() || 'AL';
}

export const MemberSettings: React.FC = () => {
  const { user, updateUser } = useAuth();
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

  // Contact number is locked to the registered profile — never manually entered.
  const phoneNumber = formatLocalContactNumber(user?.contactNumber);
  const hasProfilePhone = phoneNumber.trim().replace(/\D/g, '').length >= 9;

  // Real-time interaction tracking
  const [accountTouched, setAccountTouched] = useState<boolean>(false);

  const accInputRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLDivElement>(null);
  const phoneInputRef = useRef<HTMLDivElement>(null);
  const validationCardRef = useRef<HTMLDivElement>(null);

  const [showSaveConfirm, setShowSaveConfirm] = useState<boolean>(false);

  // ─── Profile Management State ────────────────────────────────────────────
  const activeUserId = user?.userId || (user as any)?.id || '';
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    contactNumber: user?.contactNumber || '',
    identificationNumber: user?.identificationNumber || identificationNumber || '',
    address: (user as any)?.address || '',
    status: user?.status || 'Active',
    pendingEmail: (user as any)?.pendingEmail || null as string | null,
  });
  const [inputEmail, setInputEmail] = useState(user?.email || '');
  const [inputContact, setInputContact] = useState(formatLocalContactNumber(user?.contactNumber));
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // ─── Password Change State ────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Password policy live check
  const policy = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    digit: /\d/.test(newPassword),
    special: /[@$!%*?&]/.test(newPassword),
  };
  const isPasswordPolicyMet = Object.values(policy).every(Boolean);

  // Locked to the registered profile identity, mirroring effectiveMyKad: bank
  // verification assumes the IC name and the account holder name are the same
  // person, so the member must not be able to type a different one.
  const effectiveHolderName = (user?.name || userName || '').trim();
  const hasProfileName = effectiveHolderName.length > 0;

  const effectiveMyKad = (user?.identificationNumber || identificationNumber || '').trim();

  const nameInitials = getNameInitials(effectiveHolderName || userName);

  // ─── Load saved bank details ──────────────────────────────────────────────
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

  // ─── Load full profile from backend ──────────────────────────────────────
  useEffect(() => {
    if (!activeUserId) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`http://localhost:3030/api/users/profile/${activeUserId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setProfileData(json.data);
            setInputEmail(json.data.email || '');
            setInputContact(formatLocalContactNumber(json.data.contactNumber) || '');
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    };
    fetchProfile();
  }, [activeUserId]);

  // Pre-fill contact number from the profile
  useEffect(() => {
    if (user?.contactNumber) setPhoneNumber((prev) => prev || formatLocalContactNumber(user.contactNumber));
  }, [user]);

  // Bank rule and real-time account validation
  const currentBankRule = useMemo(() => getBankRule(bankName), [bankName]);
  const accValidation = useMemo(
    () => validateBankAccNumber(bankName, accountNumber),
    [bankName, accountNumber]
  );

  // Real-time error conditions
  const showServerAccountError = Boolean(serverAccountError);
  const showAccountError = !showServerAccountError && accountTouched && !accValidation.isValid;
  const showAccountSuccess = !showServerAccountError && accountTouched && accValidation.isValid;
  const showNameError = !hasProfileName;
  const showPhoneError = !hasProfilePhone;

  // Form validity gate
  const isFormValid = Boolean(
    bankName &&
      accValidation.isValid &&
      hasProfileName &&
      effectiveMyKad.length > 0 &&
      hasProfilePhone
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

      const res = await paymentApi.getSavedBankDetails();
      setSavedAccounts(res.savedAccounts || []);
    } catch (err: any) {
      const message = err.message || 'Could not save bank details.';
      if (isAccountAttributionError(message)) {
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

  // ─── Profile submit ───────────────────────────────────────────────────────
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUserId) return;
    setProfileError(null);
    setProfileSuccess(null);
    setSavingProfile(true);
    try {
      const res = await fetch(`http://localhost:3030/api/users/profile/${activeUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inputEmail.trim(),
          contactNumber: inputContact.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfileData(data.data);
        if (data.emailVerificationSent) {
          setProfileSuccess(data.message || 'A verification link has been sent to your new email address. Your login email stays unchanged until verified.');
          updateUser({ pendingEmail: data.data.pendingEmail });
        } else {
          setProfileSuccess('Contact information updated successfully.');
          updateUser({ contactNumber: data.data.contactNumber });
        }
      } else {
        setProfileError(data.error || 'Failed to update profile details.');
      }
    } catch {
      setProfileError('Network error while saving profile. Please check server connection.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ─── Password submit ──────────────────────────────────────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current account password.');
      return;
    }
    if (!isPasswordPolicyMet) {
      setPasswordError('Your new password does not satisfy all policy criteria.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password cannot be identical to your current password.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('http://localhost:3030/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUserId, currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordSuccess('Your password has been changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(data.error || 'Failed to change password. Please verify current password.');
      }
    } catch {
      setPasswordError('Network error while changing password. Please try again.');
    } finally {
      setSavingPassword(false);
    }
  };

  // ─── Shared locked input style ────────────────────────────────────────────
  const lockedInputCls =
    'w-full px-4 py-2.5 rounded-xl border border-md-outline/20 bg-slate-100 text-slate-500 cursor-not-allowed text-sm font-medium select-none';

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
            Claimant Settings &amp; Preferences
          </h1>
          <p className="text-xs sm:text-sm text-md-on-surface-variant mt-0.5">
            Manage your default verified disbursement bank account, personal profile, and account security.
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
          <span>Profile &amp; Security</span>
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* Tab 1: Banking Settings                                             */}
      {/* ──────────────────────────────────────────────────────────────────── */}
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
                  setServerAccountError(null);
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

            {/* Locked Account Holder Name & Locked MyKad */}
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
                    ? 'No valid contact number on your profile. Update your profile before saving bank details.'
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
                <span>Review &amp; Save Default Payout Account</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* Tab 2: Profile & Security                                           */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* ── Avatar / Identity Summary Card ──────────────────────────── */}
          <div className="bg-md-surface-container border border-md-outline/15 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-4 pb-4 mb-4 border-b border-md-outline/10">
              {/* Avatar — initials of first + second word of name */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xl shadow-md shrink-0 select-none">
                {nameInitials}
              </div>
              <div>
                <h2 className="text-lg font-bold text-md-on-surface leading-tight">
                  {profileData.name || effectiveHolderName || 'Landowner'}
                </h2>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-md-secondary-container text-md-on-secondary-container mt-1">
                  <ShieldCheck size={13} />
                  Affected Landowner (Claimant)
                </span>
              </div>
            </div>

            {/* Quick info row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-md-surface-container-low border border-md-outline/10">
                <div className="flex items-center gap-1.5 text-md-on-surface-variant mb-1">
                  <FileBadge size={13} />
                  <span>MyKad / NRIC</span>
                </div>
                <div className="font-mono font-bold text-sm text-md-on-surface">
                  {profileData.identificationNumber || effectiveMyKad || '—'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-md-surface-container-low border border-md-outline/10">
                <div className="flex items-center gap-1.5 text-md-on-surface-variant mb-1">
                  <Mail size={13} />
                  <span>Active Login Email</span>
                </div>
                <div className="font-medium text-sm text-md-on-surface truncate">
                  {profileData.email || user?.email || '—'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-md-surface-container-low border border-md-outline/10">
                <div className="flex items-center gap-1.5 text-md-on-surface-variant mb-1">
                  <ShieldCheck size={13} className="text-emerald-600" />
                  <span>Account Status</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span className="font-semibold text-sm text-emerald-600">Active Verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Pending Email Banner ────────────────────────────────────── */}
          {profileData.pendingEmail && (
            <div className="p-4 rounded-xl border-l-4 border-amber-500 bg-amber-50 flex items-start gap-3">
              <Clock className="text-amber-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-sm font-bold text-amber-900">Pending Email Verification</h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  A change to <strong className="underline">{profileData.pendingEmail}</strong> is awaiting verification.
                </p>
                <p className="text-[11px] text-amber-700/90 mt-2 bg-amber-500/10 p-2 rounded-lg">
                  🛡️ <strong>Safety Guarantee:</strong> Your active login address and official notices remain tied to <strong>{profileData.email}</strong> until the new address is verified.
                </p>
              </div>
            </div>
          )}

          {/* ── Editable Contact Details Form ───────────────────────────── */}
          <form
            onSubmit={handleProfileSubmit}
            className="bg-md-surface-container border border-md-outline/15 rounded-xl p-5 sm:p-7 shadow-sm space-y-5"
          >
            <div>
              <h3 className="text-base font-bold text-md-on-surface flex items-center gap-2">
                <User size={18} className="text-md-primary" />
                <span>Contact Information</span>
              </h3>
              <p className="text-xs text-md-on-surface-variant mt-1">
                Update your registered phone number and login email address.
              </p>
            </div>

            {/* Success / Error banners */}
            {profileSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-sm flex items-start gap-3">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <div>{profileSuccess}</div>
              </div>
            )}
            {profileError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm flex items-start gap-3">
                <XCircle size={18} className="shrink-0 mt-0.5" />
                <div>{profileError}</div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Locked: Full Name */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-md-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <Lock size={12} className="text-slate-400" />
                    Official Full Name
                  </label>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Lock size={11} /> Locked to National IC
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={profileData.name || effectiveHolderName}
                  className={lockedInputCls}
                />
              </div>

              {/* Locked: IC Number */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-md-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <FileBadge size={12} className="text-slate-400" />
                    NRIC / IC Number
                  </label>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Lock size={11} /> Read-Only
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={profileData.identificationNumber || effectiveMyKad}
                  className={`${lockedInputCls} font-mono`}
                />
              </div>

              {/* Locked: Address */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-md-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={12} className="text-slate-400" />
                    Registered Address
                  </label>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Lock size={11} /> Locked to IC
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={profileData.address || (user as any)?.address || '—'}
                  className={lockedInputCls}
                />
              </div>

              {/* Editable: Phone */}
              <div>
                <label className="block text-xs font-semibold text-md-on-surface uppercase tracking-wider mb-1.5">
                  Contact Phone Number
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-3 text-md-on-surface-variant opacity-60" />
                  <input
                    type="tel"
                    required
                    value={inputContact}
                    onChange={(e) => setInputContact(e.target.value)}
                    placeholder="e.g. 012-3456789"
                    disabled={savingProfile}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-md-outline/40 bg-white text-md-on-surface text-sm focus:border-md-primary focus:ring-1 focus:ring-md-primary outline-none transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Editable: Email */}
              <div>
                <label className="block text-xs font-semibold text-md-on-surface uppercase tracking-wider mb-1.5">
                  Email Address{' '}
                  <span className="text-amber-600 font-normal normal-case">(Requires Verification if Changed)</span>
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-3 text-md-on-surface-variant opacity-60" />
                  <input
                    type="email"
                    required
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    placeholder="yourname@example.com"
                    disabled={savingProfile}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-md-outline/40 bg-white text-md-on-surface text-sm focus:border-md-primary focus:ring-1 focus:ring-md-primary outline-none transition-all disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            {/* Email policy notice */}
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
              <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Email Change Policy: </span>
                If you enter a new email address, a secure verification link will be sent there.{' '}
                <strong>Your active login address remains unchanged until the new address is verified.</strong>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-md-outline/10">
              <Button type="submit" variant="filled" disabled={savingProfile} className="gap-2">
                <Save size={16} />
                {savingProfile ? 'Saving...' : 'Save Contact Changes'}
              </Button>
            </div>
          </form>

          {/* ── Change Password Form ────────────────────────────────────── */}
          <form
            onSubmit={handlePasswordSubmit}
            className="bg-md-surface-container border border-md-outline/15 rounded-xl p-5 sm:p-7 shadow-sm space-y-5"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-md-outline/10">
              <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-md-on-surface">Change Account Password</h3>
                <p className="text-xs text-md-on-surface-variant">
                  Update your permanent portal access credential with real-time policy compliance.
                </p>
              </div>
            </div>

            {/* Password success / error banners */}
            {passwordSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-sm flex items-start gap-3">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <div>{passwordSuccess}</div>
              </div>
            )}
            {passwordError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm flex items-start gap-3">
                <XCircle size={18} className="shrink-0 mt-0.5" />
                <div>{passwordError}</div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Current password */}
              <div>
                <label className="block text-xs font-semibold text-md-on-surface uppercase tracking-wider mb-1.5">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    disabled={savingPassword}
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-md-outline/40 bg-white text-md-on-surface text-sm focus:border-md-primary focus:ring-1 focus:ring-md-primary outline-none transition-all disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="block text-xs font-semibold text-md-on-surface uppercase tracking-wider mb-1.5">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    disabled={savingPassword}
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-md-outline/40 bg-white text-md-on-surface text-sm focus:border-md-primary focus:ring-1 focus:ring-md-primary outline-none transition-all disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Confirm new password */}
              <div>
                <label className="block text-xs font-semibold text-md-on-surface uppercase tracking-wider mb-1.5">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    disabled={savingPassword}
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-md-outline/40 bg-white text-md-on-surface text-sm focus:border-md-primary focus:ring-1 focus:ring-md-primary outline-none transition-all disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1">
                    <AlertTriangle size={13} /> Passwords do not match
                  </p>
                )}
              </div>

              {/* Live policy checklist */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                <div className="flex items-center text-md-primary font-semibold mb-2">
                  <Shield size={14} className="mr-1.5" />
                  <span>Password Policy</span>
                </div>
                {[
                  { met: policy.length, label: 'Minimum 8 characters' },
                  { met: policy.upper, label: 'At least one uppercase letter (A-Z)' },
                  { met: policy.lower, label: 'At least one lowercase letter (a-z)' },
                  { met: policy.digit, label: 'At least one number digit (0-9)' },
                  { met: policy.special, label: 'At least one special character (@$!%*?&)' },
                ].map(({ met, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    {met ? (
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-slate-300 shrink-0" />
                    )}
                    <span className={met ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-md-outline/10">
              <Button
                type="submit"
                variant="filled"
                disabled={savingPassword || !isPasswordPolicyMet || newPassword !== confirmPassword || !currentPassword}
                className="gap-2"
              >
                <Lock size={16} />
                {savingPassword ? 'Updating Password...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmSubmitModal
        isOpen={showSaveConfirm}
        title="Confirm Default Payout Account"
        loading={saving}
        confirmLabel="Confirm &amp; Save Default"
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
