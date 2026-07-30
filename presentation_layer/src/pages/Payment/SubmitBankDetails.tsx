import React, { useState, useRef } from 'react';
import { paymentApi } from '../../services/paymentApi';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useNavigate } from 'react-router-dom';

export default function SubmitBankDetails() {
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  
  const [formData, setFormData] = useState({
    caseId: '',
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
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
      await paymentApi.submitBankDetails(formData);
      notify({
        type: 'success',
        title: 'Success',
        message: 'Bank Details Submitted'
      });
      navigate(`/track-payment?caseId=${encodeURIComponent(formData.caseId)}`);
    } catch (err: any) {
      notify({
        type: 'error',
        title: 'Submission Failed',
        message: err.message || 'An error occurred'
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
          />
          <Input 
            label="Account Holder Name" 
            name="accountHolderName" 
            value={formData.accountHolderName} 
            onChange={handleChange} 
            required 
            disabled={loading}
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
