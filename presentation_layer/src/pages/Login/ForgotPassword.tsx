import React, { useState } from 'react';
import { MD3Button, MD3Input, MD3Card, MD3BlurBackground } from '../MD3Components';
import { Mail, ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export const ForgotPassword: React.FC = () => {
  useDocumentTitle('Forgot Password');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await authService.forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to request password reset. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-0">
      <MD3BlurBackground />
      
      <MD3Card elevation={2} className="w-full max-w-md z-10">
        <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }} className="inline-flex items-center text-sm font-medium text-md-on-surface-variant hover:text-md-primary transition-colors mb-6">
          <ArrowLeft size={16} className="mr-1" /> Back to login
        </a>

        {!submitted ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-medium text-md-on-surface mb-2">Reset Password</h1>
              <p className="text-md-on-surface-variant">Enter your registered email address and we'll send you a secure reset link.</p>
            </div>

            {error && (
              <div className="mb-6 flex items-center gap-2 p-4 text-sm text-md-error bg-md-error-container rounded-lg">
                <AlertCircle size={20} />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <MD3Input 
                type="email" 
                label="Registered Email Address" 
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required 
              />
              <MD3Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Request Reset Link'}
              </MD3Button>
            </form>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-md-success/10 text-md-success rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={32} />
            </div>
            <h2 className="text-2xl font-medium text-md-on-surface mb-2">Check your inbox</h2>
            <p className="text-md-on-surface-variant mb-8">
              If the email matches a registered account, a password reset link has been dispatched.
            </p>
            <MD3Button variant="tonal" onClick={() => navigate('/login')} className="w-full">
              Return to Sign In
            </MD3Button>
          </div>
        )}
      </MD3Card>
    </div>
  );
};

export default ForgotPassword;
