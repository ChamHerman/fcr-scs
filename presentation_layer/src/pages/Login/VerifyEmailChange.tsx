import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MD3Card, MD3BlurBackground, MD3Button } from '../MD3Components';
import { CheckCircle2, XCircle, Loader2, MailCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export const VerifyEmailChange: React.FC = () => {
  useDocumentTitle('Verify Email Change');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your new email address...');
  const [newEmail, setNewEmail] = useState<string | null>(null);
  const hasAttempted = React.useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided in the link.');
      return;
    }

    if (hasAttempted.current) return;
    hasAttempted.current = true;

    const verify = async () => {
      try {
        const res = await fetch(`http://localhost:3030/api/users/verify-email-change?token=${encodeURIComponent(token)}`);
        const json = await res.json();

        if (res.ok && json.success) {
          setStatus('success');
          setMessage(json.message || 'Your email address has been successfully verified and updated.');
          if (json.data && json.data.email) {
            setNewEmail(json.data.email);
            if (user) {
              updateUser({ email: json.data.email, pendingEmail: null });
            }
          }
        } else {
          setStatus('error');
          setMessage(json.error || 'Verification token is invalid, expired, or has already been used.');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage('Network error. Unable to complete verification at this time.');
      }
    };

    verify();
  }, [token, user]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-0">
      <MD3BlurBackground />

      <MD3Card elevation={2} className="w-full max-w-md z-10 text-center py-10 px-6">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 size={48} className="text-md-primary animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-md-on-surface mb-2">Verifying Email...</h2>
            <p className="text-sm text-md-on-surface-variant">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <MailCheck size={36} />
            </div>
            <h2 className="text-2xl font-bold text-md-on-surface mb-2">Email Verified</h2>
            <p className="text-sm text-md-on-surface-variant mb-3">{message}</p>
            {newEmail && (
              <div className="w-full p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-800 dark:text-emerald-300 mb-6">
                Active Email: <strong>{newEmail}</strong>
              </div>
            )}
            <p className="text-xs text-gray-500 mb-6">
              You can now use this verified email address to log in and receive official system notices.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <MD3Button onClick={() => navigate('/admin/profile')} className="w-full">
                View My Profile
              </MD3Button>
              <MD3Button onClick={() => navigate('/admin')} variant="outlined" className="w-full">
                Go to Dashboard
              </MD3Button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-600 rounded-full flex items-center justify-center mb-4">
              <XCircle size={36} />
            </div>
            <h2 className="text-2xl font-bold text-md-on-surface mb-2">Verification Failed</h2>
            <p className="text-sm text-md-on-surface-variant mb-6">{message}</p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <MD3Button onClick={() => navigate('/admin/profile')} className="w-full">
                Return to Profile
              </MD3Button>
              <MD3Button onClick={() => navigate('/login')} variant="outlined" className="w-full">
                Go to Login
              </MD3Button>
            </div>
          </div>
        )}
      </MD3Card>
    </div>
  );
};

export default VerifyEmailChange;
