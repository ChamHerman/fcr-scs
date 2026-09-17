import React, { useState, useEffect } from 'react';
import { MD3Card, MD3Button, MD3Input } from '../MD3Components';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { getRoleShortForm, getRoleTitle, getNameInitials } from '../../utils/roleUtils';
import {
  User,
  Lock,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Shield,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  KeyRound,
  Eye,
  EyeOff,
  Save,
  Clock
} from 'lucide-react';
import '../LandAcquisition/case_management.css';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  contactNumber: string;
  identificationNumber: string;
  address: string;
  role: string;
  status: string;
  pendingEmail?: string | null;
  createdAt?: string;
}

export const UserProfile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const activeUserId = user?.userId || user?.id || '';
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Form states
  const [profile, setProfile] = useState<ProfileData>({
    id: activeUserId,
    name: user?.name || '',
    email: user?.email || '',
    contactNumber: user?.contactNumber || '',
    identificationNumber: user?.identificationNumber || '',
    address: (user as any)?.address || '',
    role: user?.role || '',
    status: user?.status || 'Active',
    pendingEmail: (user as any)?.pendingEmail || null,
  });

  const [inputEmail, setInputEmail] = useState('');
  const [inputContact, setInputContact] = useState('');

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Feedback alerts
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Fetch full profile from backend
  useEffect(() => {
    const fetchProfile = async () => {
      if (!activeUserId) return;
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:3030/api/users/profile/${activeUserId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setProfile(json.data);
            setInputEmail(json.data.email || '');
            setInputContact(json.data.contactNumber || '');
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [activeUserId]);

  const roleShort = getRoleShortForm(profile.role || user?.role);
  const roleTitle = getRoleTitle(profile.role || user?.role);
  const nameInitials = getNameInitials(profile.name || user?.name);
  const statusText = profile.status || ((profile as any).isActive !== false ? 'Active' : 'Inactive');

  // Password policy test
  const policy = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    digit: /\d/.test(newPassword),
    special: /[@$!%*?&]/.test(newPassword),
  };
  const isPasswordPolicyMet = Object.values(policy).every(Boolean);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!activeUserId) return;

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
        setProfile(data.data);
        if (data.emailVerificationSent) {
          setProfileSuccess(data.message);
          updateUser({ pendingEmail: data.data.pendingEmail });
        } else {
          setProfileSuccess('Profile contact information updated successfully.');
          updateUser({ contactNumber: data.data.contactNumber });
        }
      } else {
        setProfileError(data.error || 'Failed to update profile details.');
      }
    } catch (err) {
      setProfileError('Network error while saving profile. Please check server connection.');
    } finally {
      setSavingProfile(false);
    }
  };

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
        body: JSON.stringify({
          userId: activeUserId,
          currentPassword,
          newPassword,
        }),
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
    } catch (err) {
      setPasswordError('Network error while changing password. Please try again.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="main blur-shape-bg">
      <PageHeader
        title="My Profile"
        subtitle="Manage your institutional profile, contact details, and account security credentials."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Avatar Card & Identity Summary */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <MD3Card elevation={2} className="p-6 flex flex-col items-center text-center">
            {/* User Initials Avatar Badge */}
            <div className="mb-4">
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-lg select-none"
                style={{
                  background: 'linear-gradient(135deg, var(--md-primary) 0%, #4338ca 100%)',
                }}
              >
                {nameInitials}
              </div>
            </div>

            <h2 className="text-xl font-bold text-md-on-surface">{profile.name || 'User Account'}</h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-md-primary/10 text-md-primary mt-1 mb-2">
              <Shield size={13} />
              <span>{roleTitle}</span>
            </div>

            <div className="w-full border-t border-md-outline/15 my-4" />

            {/* Quick Metadata */}
            <div className="w-full space-y-3 text-xs text-left">
              <div className="flex justify-between items-center py-1">
                <span className="text-md-on-surface-variant flex items-center gap-1.5">
                  <CreditCard size={14} className="opacity-70" /> IC Number:
                </span>
                <span className="font-mono font-medium text-md-on-surface">{profile.identificationNumber || '—'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-md-on-surface-variant flex items-center gap-1.5">
                  <ShieldCheck size={14} className="opacity-70" /> Account Status:
                </span>
                <span className={`inline-flex items-center gap-1.5 font-semibold ${statusText === 'Active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${statusText === 'Active' ? 'bg-emerald-500' : 'bg-red-500'} inline-block`} />
                  <span>{statusText}</span>
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-md-on-surface-variant flex items-center gap-1.5">
                  <Mail size={14} className="opacity-70" /> Active Login Email:
                </span>
                <span className="font-medium text-md-on-surface truncate max-w-[170px]" title={profile.email}>
                  {profile.email}
                </span>
              </div>
            </div>
          </MD3Card>

          {/* Pending Email Notice Card */}
          {profile.pendingEmail && (
            <MD3Card elevation={2} className="p-5 border-l-4 border-amber-500 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <Clock className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">Pending Email Verification</h4>
                  <p className="text-xs text-amber-800 dark:text-amber-200 mt-1 leading-relaxed">
                    A change to <strong className="underline">{profile.pendingEmail}</strong> is awaiting verification.
                  </p>
                  <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 mt-2 bg-amber-500/10 p-2 rounded-lg">
                    🛡️ <strong>Safety Guarantee:</strong> Your active login address and official notices remain tied to <strong>{profile.email}</strong> until the new address is verified.
                  </p>
                </div>
              </div>
            </MD3Card>
          )}
        </div>

        {/* Right Side: Tabbed Form Container */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <MD3Card elevation={2} className="p-6 md:p-8">
            {/* Tab Switcher */}
            <div className="flex items-center justify-between border-b border-md-outline/20 pb-4 mb-6">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                    activeTab === 'profile'
                      ? 'bg-md-secondary-container text-md-on-secondary-container shadow-sm'
                      : 'text-md-on-surface-variant hover:bg-md-on-surface/5'
                  }`}
                >
                  <User size={16} />
                  <span>Personal Credentials</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('security')}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                    activeTab === 'security'
                      ? 'bg-md-secondary-container text-md-on-secondary-container shadow-sm'
                      : 'text-md-on-surface-variant hover:bg-md-on-surface/5'
                  }`}
                >
                  <KeyRound size={16} />
                  <span>Security & Password</span>
                </button>
              </div>
            </div>

            {/* TAB 1: PERSONAL CREDENTIALS */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                {profileSuccess && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-sm flex items-start gap-3">
                    <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
                    <div>{profileSuccess}</div>
                  </div>
                )}

                {profileError && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-sm flex items-start gap-3">
                    <XCircle size={18} className="flex-shrink-0 mt-0.5" />
                    <div>{profileError}</div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Read-Only Full Name */}
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-md-on-surface uppercase tracking-wider flex items-center gap-1.5">
                        <Lock size={13} className="text-gray-400" />
                        <span>Official Full Name</span>
                      </label>
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Lock size={11} /> Locked to National IC
                      </span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={profile.name}
                      className="w-full px-4 py-2.5 rounded-xl border border-md-outline/30 bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 cursor-not-allowed text-sm font-medium"
                    />
                  </div>

                  {/* Read-Only Identification Number */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-md-on-surface uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard size={13} className="text-gray-400" />
                        <span>NRIC / IC Number</span>
                      </label>
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Lock size={11} /> Read-Only
                      </span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={profile.identificationNumber}
                      className="w-full px-4 py-2.5 rounded-xl border border-md-outline/30 bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 cursor-not-allowed text-sm font-mono font-medium"
                    />
                  </div>

                  {/* Read-Only Assigned Role */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-md-on-surface uppercase tracking-wider flex items-center gap-1.5">
                        <Shield size={13} className="text-gray-400" />
                        <span>Institutional Role</span>
                      </label>
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Lock size={11} /> Read-Only
                      </span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={`${roleTitle} (${roleShort})`}
                      className="w-full px-4 py-2.5 rounded-xl border border-md-outline/30 bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 cursor-not-allowed text-sm font-medium"
                    />
                  </div>

                  {/* Read-Only Address */}
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-md-on-surface uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin size={13} className="text-gray-400" />
                        <span>Registered Residential Address</span>
                      </label>
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Lock size={11} /> Locked to IC Record
                      </span>
                    </div>
                    <textarea
                      readOnly
                      disabled
                      rows={2}
                      value={profile.address}
                      className="w-full px-4 py-2.5 rounded-xl border border-md-outline/30 bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 cursor-not-allowed text-sm resize-none"
                    />
                  </div>

                  {/* EDITABLE: Contact Number */}
                  <div>
                    <label className="block text-xs font-semibold text-md-on-surface uppercase tracking-wider mb-1.5">
                      Contact Phone Number
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-3.5 text-md-on-surface-variant opacity-60" />
                      <input
                        type="tel"
                        required
                        value={inputContact}
                        onChange={(e) => setInputContact(e.target.value)}
                        placeholder="e.g. 012-3456789"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-md-outline/40 bg-md-surface text-md-on-surface text-sm focus:border-md-primary focus:ring-1 focus:ring-md-primary outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* EDITABLE: Email Address */}
                  <div>
                    <label className="block text-xs font-semibold text-md-on-surface uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-3.5 text-md-on-surface-variant opacity-60" />
                      <input
                        type="email"
                        required
                        value={inputEmail}
                        onChange={(e) => setInputEmail(e.target.value)}
                        placeholder="yourname@institution.gov.my"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-md-outline/40 bg-md-surface text-md-on-surface text-sm focus:border-md-primary focus:ring-1 focus:ring-md-primary outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Email Re-verification Safety Banner */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-950 dark:text-blue-200 flex items-start gap-2.5">
                  <Info size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-blue-900 dark:text-blue-100">Editable Email Address Policy:</span>
                    <p className="mt-1 leading-relaxed">
                      If you enter a new email address, a secure verification link will be emailed to that new address. 
                      <strong> As long as the new email address is not verified, your active login credential and system notices will remain on your current address ({profile.email}) in the database.</strong>
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-md-outline/15">
                  <MD3Button
                    type="submit"
                    disabled={savingProfile}
                    icon={<Save size={18} />}
                  >
                    {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                  </MD3Button>
                </div>
              </form>
            )}

            {/* TAB 2: SECURITY & PASSWORD CHANGE */}
            {activeTab === 'security' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-md-outline/15">
                  <div className="w-10 h-10 rounded-full bg-md-primary/10 text-md-primary flex items-center justify-center">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-md-on-surface">Change Account Password</h3>
                    <p className="text-xs text-md-on-surface-variant">Update your permanent portal access credential with real-time policy compliance.</p>
                  </div>
                </div>

                {passwordSuccess && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-sm flex items-start gap-3">
                    <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
                    <div>{passwordSuccess}</div>
                  </div>
                )}

                {passwordError && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-sm flex items-start gap-3">
                    <XCircle size={18} className="flex-shrink-0 mt-0.5" />
                    <div>{passwordError}</div>
                  </div>
                )}

                <div className="space-y-4 max-w-lg">
                  {/* Current Password */}
                  <div>
                    <label className="block text-xs font-semibold text-md-on-surface uppercase tracking-wider mb-1.5">
                      Current Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-md-outline/40 bg-md-surface text-md-on-surface text-sm focus:border-md-primary focus:ring-1 focus:ring-md-primary outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-md-on-surface uppercase tracking-wider mb-1.5">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new strong password"
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-md-outline/40 bg-md-surface text-md-on-surface text-sm focus:border-md-primary focus:ring-1 focus:ring-md-primary outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Real-Time Password Policy Checklist */}
                  <div className="p-4 bg-md-surface-container-low border border-md-outline/20 rounded-2xl text-xs space-y-2">
                    <div className="flex items-center text-md-primary font-semibold mb-2">
                      <Shield size={14} className="mr-1.5" />
                      <span>Live Password Security Policy</span>
                    </div>
                    <ul className="space-y-1.5">
                      <li className="flex items-center gap-2">
                        {policy.length ? (
                          <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                        ) : (
                          <XCircle size={15} className="text-gray-400 flex-shrink-0" />
                        )}
                        <span className={policy.length ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-gray-500'}>
                          Minimum 8 characters
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        {policy.upper ? (
                          <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                        ) : (
                          <XCircle size={15} className="text-gray-400 flex-shrink-0" />
                        )}
                        <span className={policy.upper ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-gray-500'}>
                          At least one uppercase letter (A-Z)
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        {policy.lower ? (
                          <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                        ) : (
                          <XCircle size={15} className="text-gray-400 flex-shrink-0" />
                        )}
                        <span className={policy.lower ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-gray-500'}>
                          At least one lowercase letter (a-z)
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        {policy.digit ? (
                          <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                        ) : (
                          <XCircle size={15} className="text-gray-400 flex-shrink-0" />
                        )}
                        <span className={policy.digit ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-gray-500'}>
                          At least one number digit (0-9)
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        {policy.special ? (
                          <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                        ) : (
                          <XCircle size={15} className="text-gray-400 flex-shrink-0" />
                        )}
                        <span className={policy.special ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-gray-500'}>
                          At least one special character (@$!%*?&)
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-md-on-surface uppercase tracking-wider mb-1.5">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type new password"
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-md-outline/40 bg-md-surface text-md-on-surface text-sm focus:border-md-primary focus:ring-1 focus:ring-md-primary outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                        <AlertTriangle size={13} /> Passwords do not match
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-md-outline/15">
                  <MD3Button
                    type="submit"
                    disabled={savingPassword || !isPasswordPolicyMet || newPassword !== confirmPassword}
                    icon={<Lock size={18} />}
                  >
                    {savingPassword ? 'Updating Password...' : 'Update Password'}
                  </MD3Button>
                </div>
              </form>
            )}
          </MD3Card>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
