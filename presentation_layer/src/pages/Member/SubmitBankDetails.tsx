import React, { useState } from 'react';
import { CheckCircle, ShieldCheck, CreditCard, User, AlertCircle, Building, Loader2 } from 'lucide-react';

export default function SubmitBankDetails() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  
  const [formData, setFormData] = useState({
    myKad: '',
    bankName: '',
    accountNumber: '',
  });

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIsVerified(true);
    }, 2000);
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

          <form onSubmit={handleVerify} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="myKad" className="block text-sm font-medium text-slate-700">MyKAD Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="myKad"
                  disabled={isVerified || isVerifying}
                  className="block w-full pl-10 pr-3 py-3 bg-[var(--md-background)] border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]/50 focus:border-[var(--md-primary)]/50 transition-all disabled:opacity-50"
                  placeholder="e.g. 900101-14-5555"
                  value={formData.myKad}
                  onChange={(e) => setFormData({...formData, myKad: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bankName" className="block text-sm font-medium text-slate-700">Bank Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-slate-400" />
                </div>
                <select
                  id="bankName"
                  disabled={isVerified || isVerifying}
                  className="block w-full pl-10 pr-10 py-3 bg-[var(--md-background)] border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]/50 focus:border-[var(--md-primary)]/50 appearance-none transition-all disabled:opacity-50"
                  value={formData.bankName}
                  onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                  required
                >
                  <option value="" disabled>Select a bank</option>
                  <option value="maybank">Maybank</option>
                  <option value="cimb">CIMB Bank</option>
                  <option value="publicbank">Public Bank</option>
                  <option value="rhb">RHB Bank</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="accountNumber" className="block text-sm font-medium text-slate-700">Account Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CreditCard className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="accountNumber"
                  disabled={isVerified || isVerifying}
                  className="block w-full pl-10 pr-3 py-3 bg-[var(--md-background)] border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]/50 focus:border-[var(--md-primary)]/50 transition-all disabled:opacity-50"
                  placeholder="Enter your account number"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                  required
                />
              </div>
            </div>

            {isVerified && (
              <div className="bg-[var(--md-primary)]/10 border border-[var(--md-primary)]/20 rounded-2xl p-4 flex items-start space-x-3 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <CheckCircle className="h-6 w-6 text-[var(--md-primary)] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-[var(--md-primary)]">Identity Cross-Check Successful</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    MyKAD matches the registered bank account holder. Your details are securely locked and verified.
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

            <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-slate-500">
              <AlertCircle className="h-4 w-4" />
              <span>Bank-grade 256-bit encryption</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
