import React, { useState } from 'react';
import { MD3Button, MD3Input, MD3Card, MD3BlurBackground } from '../MD3Components';
import { UserPlus, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [showPasswordPolicy, setShowPasswordPolicy] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate registration
    alert('Registration successful! Please check your email for verification.');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-0">
      <MD3BlurBackground />
      
      <MD3Card elevation={2} className="w-full max-w-lg z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-md-tertiary/10 text-md-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus size={32} />
          </div>
          <h1 className="text-3xl font-medium text-md-on-surface mb-2">Create Account</h1>
          <p className="text-md-on-surface-variant">Register to access the system</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <MD3Input type="text" label="Full Name" required />
          <MD3Input type="email" label="Email Address" required />
          <div className="grid grid-cols-2 gap-4">
            <MD3Input type="tel" label="Contact Number" required />
            <MD3Input type="text" label="Identification Number" required />
          </div>
          
          <div className="relative">
            <MD3Input 
              type="password" 
              label="Password" 
              required 
              onFocus={() => setShowPasswordPolicy(true)}
              onBlur={() => setShowPasswordPolicy(false)}
            />
            {showPasswordPolicy && (
              <div className="absolute z-20 w-full mt-1 p-3 bg-md-surface-container-low border border-md-outline rounded-xl shadow-lg text-xs text-md-on-surface-variant">
                <div className="flex items-center text-md-primary mb-1">
                  <Info size={14} className="mr-1" />
                  <span className="font-medium">Password Policy</span>
                </div>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Minimum length 8 characters</li>
                  <li>At least one uppercase letter</li>
                  <li>At least one lowercase letter</li>
                  <li>At least one number</li>
                  <li>At least one special character</li>
                </ul>
              </div>
            )}
          </div>

          <MD3Button type="submit" className="w-full mt-8">
            Submit Registration
          </MD3Button>
          
          <div className="text-center mt-6">
            <span className="text-md-on-surface-variant text-sm">Already have an account? </span>
            <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }} className="text-sm font-medium text-md-primary hover:underline">
              Sign in
            </a>
          </div>
        </form>
      </MD3Card>
    </div>
  );
};

export default Register;
