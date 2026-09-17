import React, { useState, useEffect } from 'react';
import { MD3Button, MD3Input, MD3Card, MD3BlurBackground } from '../MD3Components';
import { LogIn, AlertCircle, CheckCircle2, RotateCw, ArrowLeft, ShieldCheck, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export const Login: React.FC = () => {
  useDocumentTitle('Login');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [email, setEmail] = useState('admin@fcrscs.gov.my');
  const [password, setPassword] = useState('Password$123');
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, countdown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setIsLoading(true);

    try {
      const response = await authService.login(email, password);

      // System Administrator requires 2FA OTP verification
      if (response.requiresOtp && response.tempToken) {
        setTempToken(response.tempToken);
        setMaskedEmail(response.email || email);
        setOtp('');
        setCountdown(60);
        setStep('otp');
        setInfoMessage('A 6-digit verification code has been dispatched to your email.');
        return;
      }

      if (response.token && response.user) {
        login(response.token, response.user);
        const role = (response.user.role || '').toUpperCase();
        if (role === 'DISPLACED_COMMUNITY_MEMBER' || role.includes('MEMBER')) {
          navigate('/member');
        } else {
          navigate('/admin');
        }
      } else {
        setError('Authentication response was incomplete. Please try again.');
      }
    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to connect to the server. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setIsLoading(true);

    try {
      const response = await authService.verifyOtp(tempToken, otp);
      if (response.token && response.user) {
        login(response.token, response.user);
        const role = (response.user.role || '').toUpperCase();
        if (role === 'DISPLACED_COMMUNITY_MEMBER' || role.includes('MEMBER')) {
          navigate('/member');
        } else {
          navigate('/admin');
        }
      } else {
        setError('OTP verification failed. Please try again.');
      }
    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Invalid or expired verification code.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    try {
      const res = await authService.resendOtp(tempToken);
      setCountdown(res.resendCooldownSeconds || 60);
      setInfoMessage(res.message || 'A fresh verification code has been dispatched to your email.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend OTP. Please return to login.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-0">
      <MD3BlurBackground />

      <div className="w-full max-w-md mb-3 flex items-center justify-between z-10">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-md-on-surface-variant hover:text-md-primary transition-colors py-1.5 px-3 rounded-xl hover:bg-md-surface-container bg-md-surface-container-low/80 border border-md-outline/10 shadow-sm"
          title="Return to Public Homepage"
        >
          <Home size={14} />
          <span>Back to Homepage</span>
        </a>
      </div>
      
      <MD3Card elevation={2} className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-md-primary/10 text-md-primary rounded-full flex items-center justify-center mx-auto mb-4">
            {step === 'credentials' ? <LogIn size={32} /> : <ShieldCheck size={32} />}
          </div>
          <h1 className="text-3xl font-medium text-md-on-surface mb-2">
            {step === 'credentials' ? 'Welcome Back' : 'Two-Factor Authentication'}
          </h1>
          <p className="text-md-on-surface-variant text-sm">
            {step === 'credentials' 
              ? 'Sign in to continue to FCR-SCS' 
              : `Enter the 6-digit OTP sent to ${maskedEmail || 'your email'}`}
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2 p-4 text-sm text-md-error bg-md-error-container rounded-lg">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {infoMessage && (
          <div className="mb-6 flex items-start gap-2 p-4 text-sm text-md-primary bg-md-primary/10 border border-md-primary/20 rounded-lg">
            <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
            <p>{infoMessage}</p>
          </div>
        )}

        {step === 'credentials' ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <MD3Input 
              type="email" 
              label="Email Address" 
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
            />
            <MD3Input 
              type="password" 
              label="Password" 
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              required
            />
            
            <div className="flex items-center justify-between">
              <a href="/forgot-password" onClick={(e) => { e.preventDefault(); navigate('/forgot-password'); }} className="text-sm font-medium text-md-primary hover:underline ml-auto">
                Forgot password?
              </a>
            </div>

            <MD3Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </MD3Button>
            
            <div className="text-center mt-6">
              <span className="text-md-on-surface-variant text-sm">Don't have an account? </span>
              <a href="/register" onClick={(e) => { e.preventDefault(); navigate('/register'); }} className="text-sm font-medium text-md-primary hover:underline">
                Register here
              </a>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="p-3 bg-md-surface-variant/40 rounded-xl border border-md-outline-variant/50 text-center">
              <span className="text-xs text-md-on-surface-variant uppercase tracking-wider font-semibold block mb-1">
                Admin Security Gate
              </span>
              <span className="text-sm text-md-on-surface font-mono">
                {maskedEmail}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-md-on-surface mb-1.5 text-center">
                6-Digit Security OTP
              </label>
              <input 
                type="text" 
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                required 
                autoFocus
                className="w-full text-center tracking-[0.6em] font-mono text-2xl py-3 px-4 rounded-xl border border-md-outline focus:border-md-primary focus:outline-none focus:ring-2 focus:ring-md-primary/20 bg-md-surface text-md-on-surface transition-all"
              />
              <p className="text-xs text-md-on-surface-variant text-center mt-1.5">
                The code expires in 5 minutes.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <MD3Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
                {isLoading ? 'Verifying Code...' : 'Verify & Continue'}
              </MD3Button>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-md-on-surface-variant hover:text-md-on-surface transition-colors"
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || isResending}
                  className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
                    countdown > 0 || isResending
                      ? 'text-md-on-surface-variant/50 cursor-not-allowed'
                      : 'text-md-primary hover:underline cursor-pointer'
                  }`}
                >
                  <RotateCw size={13} className={isResending ? 'animate-spin' : ''} />
                  {countdown > 0 ? `Resend OTP (${countdown}s)` : 'Resend OTP'}
                </button>
              </div>
            </div>
          </form>
        )}
      </MD3Card>
    </div>
  );
};

export default Login;
