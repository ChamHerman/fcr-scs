import React, { useState } from 'react';
import { MD3Button, MD3Input, MD3Card, MD3BlurBackground } from '../MD3Components';
import { Mail, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ForgotPassword: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
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

            <form onSubmit={handleSubmit} className="space-y-6">
              <MD3Input 
                type="email" 
                label="Registered Email Address" 
                required 
              />
              <MD3Button type="submit" className="w-full">
                Request Reset Link
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
