import React, { useState, useRef } from 'react';
import { paymentApi } from '../../services/paymentApi';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useAuth } from '../../context/AuthContext';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useNavigate } from 'react-router-dom';
import { formatLocalContactNumber } from '../Member/components/BankDetailsForm';
import {
  isAccountAttributionError,
  ACCOUNT_ATTRIBUTION_HINT,
} from '../Member/components/bankValidation';
import { Lock } from 'lucide-react';

export default function SubmitBankDetails() {
  const { notify } = useNotification();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  // Server-side rejection of the account number itself (already attributed to
  // another beneficiary) — surfaced on the field, not only in the toast.
  const [serverAccountError, setServerAccountError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Locked to the registered profile identity: bank verification assumes the IC
  // name and the account holder name are the same person, so the member cannot
  // type a different one. The backend re-derives it from the session user.
  const effectiveHolderName = (user?.name || '').trim();

  const [formData, setFormData] = useState({
    caseId: '',
    bankName: '',
    accountNumber: '',
    phoneNumber: '',
    myKadNumber: ''
  });

  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Page container entrance
    gsap.fromTo(pageRef.current,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
    );
    // Form fields stagger up
    if (formRef.current) {
      gsap.from(formRef.current.children, {
        y: 20,
        opacity: 0,
        stagger: 0.1,
        ease: 'back.out(1.5)',
        duration: 0.6,
        delay: 0.2
      });
    }
  }, { scope: pageRef });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === 'accountNumber') setServerAccountError(null);
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // C1: Identity Match Validation (Mock)
    if (formData.myKadNumber && formData.myKadNumber.length < 12) {
      notify({ type: 'error', title: 'Validation Error', message: 'Invalid MyKAD Number' });
      return;
    }

    setLoading(true);
    try {
      await paymentApi.submitBankDetails({
        ...formData,
        accountHolderName: effectiveHolderName,
        phoneNumber: formatLocalContactNumber(formData.phoneNumber),
      });
      notify({
        type: 'success',
        title: 'Success',
        message: 'Bank Details Submitted'
      });
      navigate(`/track-payment?caseId=${encodeURIComponent(formData.caseId)}`);
    } catch (err: any) {
      const message = err.message || 'An error occurred';
      if (isAccountAttributionError(message)) {
        setServerAccountError(ACCOUNT_ATTRIBUTION_HINT);
      }
      notify({
        type: 'error',
        title: 'Submission Failed',
        message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6" ref={pageRef}>
      <div className="bg-[var(--md-surface-container)] p-8 rounded-3xl shadow-sm">
        <h2 className="text-2xl font-semibold mb-6">Submit Bank Details</h2>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Case ID" 
            name="caseId" 
            value={formData.caseId} 
            onChange={handleChange} 
            required 
            disabled={loading}
          />
          <Input 
            label="Bank Name" 
            name="bankName" 
            value={formData.bankName} 
            onChange={handleChange} 
            required 
            disabled={loading}
          />
          <Input
            label="Account Number"
            name="accountNumber"
            value={formData.accountNumber}
            onChange={handleChange}
            required
            disabled={loading}
            error={serverAccountError ?? undefined}
            inputClassName={
              serverAccountError
                ? '!border-rose-500 !ring-2 !ring-rose-500/25 !text-rose-900 dark:!text-rose-100'
                : ''
            }
          />
          <Input
            label="Registered Account Holder Full Name"
            name="accountHolderName"
            value={effectiveHolderName}
            readOnly={true}
            disabled={true}
            autoComplete="off"
            placeholder="As per your registered MyKad name"
            suffix={<Lock size={14} />}
          />
          <Input 
            label="Phone Number" 
            name="phoneNumber" 
            value={formData.phoneNumber} 
            onChange={handleChange} 
            required 
            disabled={loading}
          />
          <Input 
            label="MyKAD Number" 
            name="myKadNumber" 
            value={formData.myKadNumber} 
            onChange={handleChange} 
            required 
            disabled={loading}
          />
          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full rounded-full"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Details'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
