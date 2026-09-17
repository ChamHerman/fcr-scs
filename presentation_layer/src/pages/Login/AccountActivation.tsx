import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MD3Card, MD3BlurBackground, MD3Button } from '../MD3Components';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { authService } from '../../services/auth.service';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export const AccountActivation: React.FC = () => {
  useDocumentTitle('Account Activation');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Activating your account...');
  const hasAttempted = React.useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No activation token found in the URL.');
      return;
    }

    if (hasAttempted.current) return;
    hasAttempted.current = true;

    const activate = async () => {
      try {
        const res = await authService.activateAccount(token);
        setStatus('success');
        setMessage(res.message || 'Your account has been successfully activated.');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Failed to activate account. The link may have expired.');
      }
    };

    activate();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-0">
      <MD3BlurBackground />
      
      <MD3Card elevation={2} className="w-full max-w-md z-10 text-center py-10">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 size={48} className="text-md-primary animate-spin mb-4" />
            <h2 className="text-2xl font-medium text-md-on-surface mb-2">Activating...</h2>
            <p className="text-md-on-surface-variant">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-medium text-md-on-surface mb-2">Activation Successful</h2>
            <p className="text-md-on-surface-variant mb-8">{message}</p>
            <MD3Button onClick={() => navigate('/login')} className="w-full max-w-xs">
              Go to Login
            </MD3Button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-md-error/10 text-md-error rounded-full flex items-center justify-center mb-4">
              <XCircle size={32} />
            </div>
            <h2 className="text-2xl font-medium text-md-on-surface mb-2">Activation Failed</h2>
            <p className="text-md-on-surface-variant mb-8">{message}</p>
            <MD3Button onClick={() => navigate('/login')} className="w-full max-w-xs" variant="outlined">
              Return to Login
            </MD3Button>
          </div>
        )}
      </MD3Card>
    </div>
  );
};

export default AccountActivation;
