import React, { useState } from 'react';
import { MD3Button, MD3Input, MD3Card, MD3BlurBackground } from '../../pages/MD3Components';
import { Lock, ShieldAlert, CheckCircle2, XCircle, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const FirstTimePasswordModal: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!user || !user.mustChangePassword) {
    return null;
  }

  const validatePassword = (pwd: string) => {
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return re.test(pwd);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError('Please enter your current temporary password.');
      return;
    }

    if (!validatePassword(newPassword)) {
      setError('New password does not meet the policy requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3030/api/users/change-initial-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('Password changed successfully! Unlocking your dashboard...');
        setTimeout(() => {
          updateUser({ mustChangePassword: false });
        }, 1200);
      } else {
        setError(data.error || 'Failed to change password. Please verify your current temporary password.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <MD3BlurBackground />
      
      <MD3Card elevation={3} className="w-full max-w-lg z-10 p-6 md:p-8 bg-md-surface border border-md-outline/30 rounded-3xl shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-bold text-md-on-surface">Initial Password Setup Required</h2>
          <p className="text-sm text-md-on-surface-variant mt-1.5">
            Your account was provisioned with a temporary credential. For security compliance, you must set a permanent password to access the platform.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
            <XCircle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <MD3Input 
            type="password"
            label="Current Temporary Password *"
            required
            value={currentPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
            disabled={isLoading}
            placeholder="Enter temporary password from email"
          />

          <MD3Input 
            type="password"
            label="New Permanent Password *"
            required
            value={newPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
            disabled={isLoading}
            placeholder="At least 8 characters"
          />

          <MD3Input 
            type="password"
            label="Confirm New Password *"
            required
            value={confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            placeholder="Re-enter new password"
          />

          {/* Password Policy Checklist */}
          <div className="p-3 bg-md-surface-container-low border border-md-outline/20 rounded-xl text-xs text-md-on-surface-variant">
            <div className="flex items-center text-md-primary font-medium mb-1.5">
              <Info size={14} className="mr-1" />
              <span>Password Policy Requirements</span>
            </div>
            <ul className="space-y-1 mt-1">
              <li className="flex items-center gap-2">
                {newPassword.length >= 8 ? <CheckCircle2 size={13} className="text-green-500" /> : <XCircle size={13} className="text-red-500" />}
                <span className={newPassword.length >= 8 ? "text-green-600 font-medium" : ""}>Minimum 8 characters</span>
              </li>
              <li className="flex items-center gap-2">
                {/[A-Z]/.test(newPassword) ? <CheckCircle2 size={13} className="text-green-500" /> : <XCircle size={13} className="text-red-500" />}
                <span className={/[A-Z]/.test(newPassword) ? "text-green-600 font-medium" : ""}>At least one uppercase letter (A-Z)</span>
              </li>
              <li className="flex items-center gap-2">
                {/[a-z]/.test(newPassword) ? <CheckCircle2 size={13} className="text-green-500" /> : <XCircle size={13} className="text-red-500" />}
                <span className={/[a-z]/.test(newPassword) ? "text-green-600 font-medium" : ""}>At least one lowercase letter (a-z)</span>
              </li>
              <li className="flex items-center gap-2">
                {/\d/.test(newPassword) ? <CheckCircle2 size={13} className="text-green-500" /> : <XCircle size={13} className="text-red-500" />}
                <span className={/\d/.test(newPassword) ? "text-green-600 font-medium" : ""}>At least one digit (0-9)</span>
              </li>
              <li className="flex items-center gap-2">
                {/[@$!%*?&]/.test(newPassword) ? <CheckCircle2 size={13} className="text-green-500" /> : <XCircle size={13} className="text-red-500" />}
                <span className={/[@$!%*?&]/.test(newPassword) ? "text-green-600 font-medium" : ""}>At least one special character (@$!%*?&)</span>
              </li>
            </ul>
          </div>

          <MD3Button type="submit" className="w-full mt-4" disabled={isLoading}>
            {isLoading ? 'Setting New Password...' : 'Save Password & Access Platform'}
          </MD3Button>
        </form>
      </MD3Card>
    </div>
  );
};

export default FirstTimePasswordModal;
