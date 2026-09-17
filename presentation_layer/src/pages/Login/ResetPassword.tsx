import React, { useState, useEffect } from 'react';
import { MD3Button, MD3Input, MD3Card, MD3BlurBackground } from '../MD3Components';
import { Lock, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export const ResetPassword: React.FC = () => {
  useDocumentTitle('Reset Password');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(token, newPassword);
      setSubmitted(true);
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to reset password. The link might be expired.');
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
              <h1 className="text-3xl font-medium text-md-on-surface mb-2">Create New Password</h1>
              <p className="text-md-on-surface-variant">Your new password must be different from previously used passwords.</p>
            </div>

            {error && (
              <div className="mb-6 flex items-center gap-2 p-4 text-sm text-md-error bg-md-error-container rounded-lg">
                <AlertCircle size={20} />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <MD3Input 
                type="password" 
                label="New Password" 
                value={newPassword} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                required 
              />

              {/* Password Policy Checklist */}
              <div className="p-3 bg-md-surface-container-low border border-md-outline/20 rounded-xl text-xs text-md-on-surface-variant">
                <p className="font-semibold text-md-primary mb-1">Password Policy Requirements:</p>
                <ul className="space-y-1">
                  <li className={`flex items-center gap-2 ${newPassword.length >= 8 ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                    <span>{newPassword.length >= 8 ? '✓' : '•'}</span> Minimum 8 characters
                  </li>
                  <li className={`flex items-center gap-2 ${/[A-Z]/.test(newPassword) ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                    <span>{/[A-Z]/.test(newPassword) ? '✓' : '•'}</span> At least one uppercase letter (A-Z)
                  </li>
                  <li className={`flex items-center gap-2 ${/[a-z]/.test(newPassword) ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                    <span>{/[a-z]/.test(newPassword) ? '✓' : '•'}</span> At least one lowercase letter (a-z)
                  </li>
                  <li className={`flex items-center gap-2 ${/\d/.test(newPassword) ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                    <span>{/\d/.test(newPassword) ? '✓' : '•'}</span> At least one digit (0-9)
                  </li>
                  <li className={`flex items-center gap-2 ${/[@$!%*?&]/.test(newPassword) ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                    <span>{/[@$!%*?&]/.test(newPassword) ? '✓' : '•'}</span> At least one special character (@$!%*?&)
                  </li>
                </ul>
              </div>

              <MD3Input 
                type="password" 
                label="Confirm Password" 
                value={confirmPassword} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                required 
              />
              <MD3Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !token || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(newPassword) || newPassword !== confirmPassword}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </MD3Button>
            </form>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-md-success/10 text-md-success rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-2xl font-medium text-md-on-surface mb-2">Password Reset Successful</h2>
            <p className="text-md-on-surface-variant mb-8">
              Your password has been successfully reset. You can now use your new password to sign in.
            </p>
            <MD3Button variant="tonal" onClick={() => navigate('/login')} className="w-full">
              Proceed to Sign In
            </MD3Button>
          </div>
        )}
      </MD3Card>
    </div>
  );
};

export default ResetPassword;
