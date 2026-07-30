import React, { useState } from 'react';
import { CheckCircle, ShieldCheck, CreditCard, User, AlertCircle, Building, Loader2, Phone, Hash } from 'lucide-react';
import { paymentApi } from '../../services/paymentApi';

export default function SubmitBankDetails() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    caseId: 'CASE-001',
    myKad: '900101-14-5555',
    bankName: 'Maybank',
    accountNumber: '112233445566',
    accountHolderName: 'Ahmad bin Abdullah',
    phoneNumber: '+60123456789',
  });

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError('');

    try {
      await paymentApi.submitBankDetails({
        caseId: formData.caseId.trim(),
        bankName: formData.bankName,
        accountNumber: formData.accountNumber.trim(),
        accountHolderName: formData.accountHolderName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        myKadNumber: formData.myKad.trim(),
      });
      setIsVerified(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit bank details');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--md-background)] flex items-center justify-center p-4 sm:p-6 font-sans text-slate-900">
      <div className="max-w-md w-full relative">
        <div className="relative bg-[var(--md-surface-container)] rounded-[2rem] p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="h-16 w-16 bg-[var(--md-primary)]/10 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="h-8 w-8 text-[var(--md-primary)]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight text-center">Secure Bank Details</h1>
            <p className="text-slate-600 text-sm mt-2 text-center">
              Please enter your details to receive your compensation securely.
            </p>
          </div>

          {error && <p className="text-red-500 text-sm font-medium mb-4 text-center">{error}</p>}

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="caseId" className="block text-sm font-medium text-slate-700">Case ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Hash className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="caseId"
                  disabled={isVerified || isVerifying}
                  className="block w-full pl-10 pr-3 py-2.5 bg-[var(--md-background)] border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]/50 transition-all disabled:opacity-50"
                  value={formData.caseId}
                  onChange={(e) => setFormData({...formData, caseId: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="accountHolderName" className="block text-sm font-medium text-slate-700">Full Name (as in Bank)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="accountHolderName"
                  disabled={isVerified || isVerifying}
                  className="block w-full pl-10 pr-3 py-2.5 bg-[var(--md-background)] border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]/50 transition-all disabled:opacity-50"
                  value={formData.accountHolderName}
                  onChange={(e) => setFormData({...formData, accountHolderName: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="myKad" className="block text-sm font-medium text-slate-700">MyKAD Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="myKad"
                  disabled={isVerified || isVerifying}
                  className="block w-full pl-10 pr-3 py-2.5 bg-[var(--md-background)] border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]/50 transition-all disabled:opacity-50"
                  value={formData.myKad}
                  onChange={(e) => setFormData({...formData, myKad: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="bankName" className="block text-sm font-medium text-slate-700">Bank Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-slate-400" />
                </div>
                <select
                  id="bankName"
                  disabled={isVerified || isVerifying}
                  className="block w-full pl-10 pr-10 py-2.5 bg-[var(--md-background)] border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]/50 transition-all disabled:opacity-50"
                  value={formData.bankName}
                  onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                  required
                >
                  <option value="Maybank">Maybank</option>
                  <option value="CIMB Bank">CIMB Bank</option>
                  <option value="Public Bank">Public Bank</option>
                  <option value="RHB Bank">RHB Bank</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="accountNumber" className="block text-sm font-medium text-slate-700">Account Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CreditCard className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="accountNumber"
                  disabled={isVerified || isVerifying}
                  className="block w-full pl-10 pr-3 py-2.5 bg-[var(--md-background)] border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]/50 transition-all disabled:opacity-50"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-700">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="phoneNumber"
                  disabled={isVerified || isVerifying}
                  className="block w-full pl-10 pr-3 py-2.5 bg-[var(--md-background)] border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]/50 transition-all disabled:opacity-50"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  required
                />
              </div>
            </div>

            {isVerified && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start space-x-3 mt-6">
                <CheckCircle className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-green-800">Bank Details Submitted Successfully</h4>
                  <p className="text-xs text-green-700 mt-1">
                    Your account details have been recorded and sent for transfer verification.
                  </p>
                </div>
              </div>
            )}

            {!isVerified && (
              <button
                type="submit"
                disabled={isVerifying}
                className="w-full mt-6 bg-[var(--md-primary)] hover:bg-[var(--md-primary)]/90 text-white font-medium py-3.5 px-4 rounded-full shadow-sm transition-all transform active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Verifying Details...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    <span>Verify & Submit</span>
                  </>
                )}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

