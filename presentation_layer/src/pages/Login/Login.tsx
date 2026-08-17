import React, { useState } from 'react';
import { MD3Button, MD3Input, MD3Card, MD3BlurBackground } from '../MD3Components';
import { LogIn, KeyRound, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';

export const Login: React.FC = () => {
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [email, setEmail] = useState('admin@fcrscs.gov.my');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await authService.login(email, password);
      login(response.token, response.user);
      
      // Navigate to admin dashboard after successful login
      navigate('/admin');
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to connect to the server. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTP = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/admin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-0">
      <MD3BlurBackground />
      
      <MD3Card elevation={2} className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-md-primary/10 text-md-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn size={32} />
          </div>
          <h1 className="text-3xl font-medium text-md-on-surface mb-2">Welcome Back</h1>
          <p className="text-md-on-surface-variant">Sign in to continue to FCR-SCS</p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 p-4 text-sm text-md-error bg-md-error-container rounded-lg">
            <AlertCircle size={20} />
            <p>{error}</p>
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
          <form onSubmit={handleOTP} className="space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-md-secondary-container text-md-on-secondary-container mb-2">
                <KeyRound size={24} />
              </div>
              <p className="text-sm text-md-on-surface-variant">Enter the 6-digit OTP sent to your registered device.</p>
            </div>
            
            <MD3Input 
              type="text" 
              label="One-Time Password" 
              maxLength={6}
              required 
              className="text-center tracking-widest text-lg"
            />

            <div className="flex space-x-4">
              <MD3Button type="button" variant="outlined" className="flex-1" onClick={() => setStep('credentials')}>
                Back
              </MD3Button>
              <MD3Button type="submit" className="flex-1">
                Verify
              </MD3Button>
            </div>
          </form>
        )}
      </MD3Card>
    </div>
  );
};

export default Login;
