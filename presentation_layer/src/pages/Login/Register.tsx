import React, { useState, useEffect } from 'react';
import { MD3Button, MD3Input, MD3Card, MD3BlurBackground } from '../MD3Components';
import { UserPlus, Info, AlertTriangle, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { IdentificationInput } from '../../components/ui/IdentificationInput';
import { resolveMalaysianIdentity, parseRawIc, type MalaysianIdentity } from '../../utils/malaysianIdentity';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [showPasswordPolicy, setShowPasswordPolicy] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNumber: '',
    identificationNumber: '',
    address: '',
    password: ''
  });
  const [identityInfo, setIdentityInfo] = useState<MalaysianIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-resolve fixed name and state-accurate address when 12-digit Malaysian IC is entered
  useEffect(() => {
    const rawDigits = parseRawIc(formData.identificationNumber);
    if (rawDigits.length === 12) {
      const identity = resolveMalaysianIdentity(rawDigits);
      setIdentityInfo(identity);
      setFormData(prev => ({
        ...prev,
        name: identity.name,
        address: identity.address
      }));
    } else {
      setIdentityInfo(null);
    }
  }, [formData.identificationNumber]);

  const validatePassword = (pwd: string) => {
    // Minimum 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return re.test(pwd);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!/^\d{12}$/.test(formData.identificationNumber.replace(/[-\s]/g, ''))) {
      setError("Identification number must be exactly 12 digits.");
      return;
    }

    if (!formData.name.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!formData.address.trim()) {
      setError("Residential address is required.");
      return;
    }

    if (!/^\d{10,11}$/.test(formData.contactNumber.replace(/[-\s]/g, ''))) {
      setError("Contact number must be 10 or 11 digits.");
      return;
    }

    if (!validatePassword(formData.password)) {
      setError("Password does not meet the policy requirements.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.register(formData);
      setSuccessMessage(res.message || 'Registration successful! Please check your email for verification.');
      // Optional: Navigate after a few seconds or let them click login
      setTimeout(() => navigate('/login'), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-0">
      <MD3BlurBackground />
      
      <MD3Card elevation={2} className="w-full max-w-lg z-10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-md-tertiary/10 text-md-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus size={32} />
          </div>
          <h1 className="text-3xl font-medium text-md-on-surface mb-2">Create Account</h1>
          <p className="text-md-on-surface-variant">Register to access the system</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 font-medium flex items-center text-sm border border-red-500/20">
              <AlertTriangle size={18} className="mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-xl bg-green-500/10 text-green-700 dark:text-green-400 flex items-center text-sm border border-green-500/20">
              <Info size={18} className="mr-2 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* IC Input with automatic name & address resolution */}
          <div>
            <IdentificationInput 
              label="Malaysian IC Number *" 
              name="identificationNumber" 
              value={formData.identificationNumber} 
              onChange={handleChange} 
              disabled={isLoading} 
              placeholder="900101-14-5532"
            />
            {identityInfo?.isValid ? (
              <div className="mt-2 p-2.5 rounded-xl bg-md-primary/10 border border-md-primary/20 text-md-primary text-xs flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="flex-shrink-0 text-md-primary" />
                  <span>Verified: <strong>{identityInfo.state}</strong> • <strong>{identityInfo.gender}</strong> • Born {identityInfo.dateOfBirth}</span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-md-primary/20 text-md-primary px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Sparkles size={10} /> Auto-filled
                </span>
              </div>
            ) : (
              <div className="mt-1 text-[11px] text-md-on-surface-variant/70 pl-1">
                Enter your 12-digit IC to automatically resolve your verified full name and residential address.
              </div>
            )}
          </div>

          <MD3Input 
            type="text" 
            label="Full Name (Locked to IC) *" 
            name="name" 
            required 
            value={formData.name} 
            readOnly 
            disabled={isLoading} 
            placeholder="Auto-populated from IC"
          />

          <MD3Input 
            type="text" 
            label="Residential Address (Locked to IC) *" 
            name="address" 
            required 
            value={formData.address} 
            readOnly 
            disabled={isLoading} 
            placeholder="Auto-populated state address from IC"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MD3Input 
              type="email" 
              label="Email Address *" 
              name="email" 
              required 
              value={formData.email} 
              onChange={handleChange} 
              disabled={isLoading} 
            />
            <MD3Input 
              type="tel" 
              label="Contact Number *" 
              name="contactNumber" 
              required 
              value={formData.contactNumber} 
              onChange={handleChange} 
              disabled={isLoading} 
              placeholder="0123456789"
            />
          </div>
          
          <div className="relative">
            <MD3Input 
              type="password" 
              name="password"
              label="Password *" 
              required 
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              onFocus={() => setShowPasswordPolicy(true)}
              onBlur={() => setShowPasswordPolicy(false)}
            />
            {showPasswordPolicy && (
              <div className="absolute z-20 w-full mt-1 p-3 bg-md-surface-container-low border border-md-outline rounded-xl shadow-lg text-xs text-md-on-surface-variant">
                <div className="flex items-center text-md-primary mb-1">
                  <Info size={14} className="mr-1" />
                  <span className="font-medium">Password Policy</span>
                </div>
                <ul className="space-y-1.5 mt-2">
                  <li className="flex items-center space-x-2">
                    {formData.password.length >= 8 ? <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" /> : <XCircle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0" />}
                    <span className={formData.password.length >= 8 ? "text-green-600 dark:text-green-400" : ""}>Minimum length 8 characters</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    {/[A-Z]/.test(formData.password) ? <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" /> : <XCircle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0" />}
                    <span className={/[A-Z]/.test(formData.password) ? "text-green-600 dark:text-green-400" : ""}>At least one uppercase letter</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    {/[a-z]/.test(formData.password) ? <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" /> : <XCircle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0" />}
                    <span className={/[a-z]/.test(formData.password) ? "text-green-600 dark:text-green-400" : ""}>At least one lowercase letter</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    {/\d/.test(formData.password) ? <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" /> : <XCircle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0" />}
                    <span className={/\d/.test(formData.password) ? "text-green-600 dark:text-green-400" : ""}>At least one number</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    {/[@$!%*?&]/.test(formData.password) ? <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" /> : <XCircle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0" />}
                    <span className={/[@$!%*?&]/.test(formData.password) ? "text-green-600 dark:text-green-400" : ""}>At least one special character</span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          <MD3Button type="submit" className="w-full mt-6" disabled={isLoading}>
            {isLoading ? 'Registering...' : 'Submit Registration'}
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
