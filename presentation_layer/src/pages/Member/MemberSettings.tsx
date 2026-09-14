import React, { useState, useEffect } from 'react';
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
  FileBadge
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../hooks/useRole';
import { useNotification } from '../../components/ui/NotificationSystem';
import { paymentApi } from '../../services/paymentApi';
import { normalizeContactNumber } from './components/BankDetailsForm';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Select, type SelectOption } from '../../components/ui/Select';
import { ConfirmSubmitModal, ConfirmRow } from '../../components/member/ConfirmSubmitModal';

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
  const [accountHolderName, setAccountHolderName] = useState<string>(user?.name || userName || '');
  const [myKadNumber, setMyKadNumber] = useState<string>(user?.identificationNumber || identificationNumber || '');
  const [phoneNumber, setPhoneNumber] = useState<string>(normalizeContactNumber(user?.contactNumber));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSaveConfirm, setShowSaveConfirm] = useState<boolean>(false);

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
            if (acc.accountHolderName) setAccountHolderName(acc.accountHolderName);
            if (acc.myKadNumber) setMyKadNumber(acc.myKadNumber);
            if (acc.phoneNumber) setPhoneNumber(normalizeContactNumber(acc.phoneNumber));
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

  // FR-017: Save validates the form and opens the confirmation dialog; the
  // dialog's Confirm performs the actual save.
  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!bankName) errs.bankName = 'Please select your bank institution';
    if (!accountNumber || accountNumber.replace(/[^0-9]/g, '').length < 6) {
      errs.accountNumber = 'Valid bank account number is required (min 6 digits)';
    }
    if (!accountHolderName.trim()) {
      errs.accountHolderName = 'Account holder full name is required';
    }
    if (!myKadNumber.trim()) {
      errs.myKadNumber = 'MyKad / NRIC is required';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setShowSaveConfirm(true);
  };

  const handleConfirmedSave = async () => {
    setSaving(true);
    setErrors({});
    try {
      const effectiveMyKad = (user?.identificationNumber || identificationNumber || myKadNumber || '').trim();
      const cleanPhone = normalizeContactNumber(phoneNumber);
      await paymentApi.saveDefaultBankDetails({
        bankName,
        accountNumber: accountNumber.trim(),
        accountHolderName: accountHolderName.trim(),
        myKadNumber: effectiveMyKad,
        phoneNumber: cleanPhone ? `+60${cleanPhone}` : '',
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
      notify({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not save bank details.',
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
          <form onSubmit={handleSaveBankDetails} className="bg-md-surface-container border border-md-outline/15 rounded-xl p-5 sm:p-7 shadow-sm space-y-5">
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
                label="Bank Institution"
                options={MALAYSIAN_BANKS}
                value={bankName}
                onChange={(val) => {
                  setBankName(val);
                  if (errors.bankName) setErrors((prev) => ({ ...prev, bankName: '' }));
                }}
                error={errors.bankName}
              />
            </div>

            {/* Account Number */}
            <Input
              label="Account Number"
              name="accountNumber"
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value);
                if (errors.accountNumber) setErrors((prev) => ({ ...prev, accountNumber: '' }));
              }}
              placeholder="e.g. 114012345678"
              error={errors.accountNumber}
              className="font-mono"
              required
            />

            {/* Holder & MyKad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Account Holder Full Name"
                name="accountHolderName"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                placeholder="Full Name as per MyKad"
                error={errors.accountHolderName}
                required
              />

              <div>
                <Input
                  label="MyKad / Identification Number"
                  name="myKadNumber"
                  value={user?.identificationNumber || identificationNumber || myKadNumber}
                  readOnly={true}
                  disabled={true}
                  suffix={<Lock size={14} />}
                  required
                />
                <p className="text-[11px] text-md-on-surface-variant mt-1 flex items-center gap-1">
                  <Lock size={12} className="text-md-primary shrink-0" />
                  <span>Verified citizen identification number (Immutable)</span>
                </p>
              </div>
            </div>

            {/* Phone */}
            <Input
              label="Contact Phone Number"
              name="phoneNumber"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(normalizeContactNumber(e.target.value))}
              placeholder="172178475"
              prefix="+60"
              aria-label="Contact Phone Number, country code +60"
              className="font-mono"
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-md-outline/10">
              <Button
                type="submit"
                variant="filled"
                disabled={saving}
                className="w-full sm:w-auto"
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
                {user?.contactNumber || phoneNumber || '—'}
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
        confirmLabel="Confirm & Save"
        onConfirm={handleConfirmedSave}
        onCancel={() => setShowSaveConfirm(false)}
        summary={
          <>
            <ConfirmRow label="Bank" value={bankName} />
            <ConfirmRow label="Account Number" value={accountNumber.trim()} mono />
            <ConfirmRow label="Account Holder" value={accountHolderName.trim()} />
            <ConfirmRow
              label="MyKad"
              value={user?.identificationNumber || identificationNumber || myKadNumber}
              mono
            />
            {phoneNumber.trim() && (
              <ConfirmRow
                label="Phone"
                value={`+60 ${normalizeContactNumber(phoneNumber)}`}
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
