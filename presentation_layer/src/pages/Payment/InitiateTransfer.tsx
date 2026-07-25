import React, { useState, useMemo } from 'react';
import { 
  Send, Shield, ShieldAlert, FileText, 
  DollarSign, Users, Info, ChevronRight, Lock, 
  CheckCircle, ArrowRight, Wallet, UserCheck
} from 'lucide-react';

export default function InitiateTransfer() {
  const [amount, setAmount] = useState<string>('');
  
  const numericAmount = parseFloat(amount.replace(/,/g, '')) || 0;
  
  const sigLevel = useMemo(() => {
    if (numericAmount === 0) return { count: 0, label: 'Enter amount to calculate routing', color: 'text-md-on-surface-variant', border: 'border-md-outline/20', bg: 'bg-md-surface-container-low', icon: Lock };
    if (numericAmount < 10000) return { count: 1, label: 'Standard Authorization', color: 'text-md-on-success', border: 'border-md-success', bg: 'bg-md-success', icon: Shield };
    if (numericAmount < 50000) return { count: 2, label: 'Dual Authorization Required', color: 'text-md-on-warning', border: 'border-md-warning', bg: 'bg-md-warning', icon: Users };
    return { count: 3, label: 'Director Level Approval Required', color: 'text-md-on-error', border: 'border-md-error', bg: 'bg-md-error', icon: ShieldAlert };
  }, [numericAmount]);

  const Icon = sigLevel.icon || Lock;

  return (
    <div className="text-md-on-surface p-8 relative overflow-hidden font-sans">
      {/* Dynamic Background Gradient Based on Amount */}
      <div className={`absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] pointer-events-none transition-colors duration-700 ease-in-out
        ${numericAmount === 0 ? 'bg-md-surface-container/50' : 
          numericAmount < 10000 ? 'bg-md-success/40' : 
          numericAmount < 50000 ? 'bg-md-warning/40' : 'bg-md-error/40'}`} 
      />

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        <div className="mb-10">
          <h1 className="text-3xl font-medium tracking-tight text-md-on-surface mb-2">Initiate Transfer</h1>
          <p className="text-md-on-surface-variant">Process payouts for approved compensation cases.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-md-surface-container border border-md-outline/10 rounded-3xl p-8 shadow-sm">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-md-on-surface-variant mb-2">Case Reference</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-md-on-surface-variant/70" />
                    <input 
                      type="text" 
                      placeholder="e.g. CAS-2026-8921" 
                      className="bg-md-surface-container-low border border-md-outline/20 rounded-2xl pl-12 pr-4 py-3.5 text-md-on-surface placeholder:text-md-on-surface-variant/50 focus:outline-none focus:border-md-primary focus:ring-1 focus:ring-md-primary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-md-on-surface-variant mb-2">Beneficiary Name</label>
                  <div className="relative">
                    <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-md-on-surface-variant/70" />
                    <input 
                      type="text" 
                      placeholder="Enter exact account name" 
                      className="bg-md-surface-container-low border border-md-outline/20 rounded-2xl pl-12 pr-4 py-3.5 text-md-on-surface placeholder:text-md-on-surface-variant/50 focus:outline-none focus:border-md-primary focus:ring-1 focus:ring-md-primary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-md-on-surface-variant mb-2">Transfer Amount (USD)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-md-primary" />
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-md-surface-container-low border border-md-outline/20 rounded-2xl pl-12 pr-4 py-4 text-2xl font-semibold text-md-on-surface placeholder:text-md-on-surface-variant/40 focus:outline-none focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-10 flex justify-end">
                <button className="flex items-center gap-2 px-8 py-4 bg-md-primary hover:opacity-90 active:scale-95 ease-md-bouncy shadow-sm rounded-full text-md-on-primary font-medium transition-all duration-300">
                  <span>Review Transfer</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Side Panel: Security & Routing */}
          <div className="lg:col-span-1 space-y-6">
            <div className={`bg-md-surface-container border ${sigLevel.border} rounded-3xl p-6 transition-all duration-500 relative overflow-hidden shadow-sm`}>
              <div className={`absolute top-0 right-0 w-32 h-32 ${sigLevel.bg} blur-3xl -mr-10 -mt-10 rounded-full transition-colors duration-500 opacity-50`} />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2.5 rounded-2xl ${sigLevel.bg} ${sigLevel.color} border ${sigLevel.border}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-medium text-md-on-surface">Routing Logic</h3>
                </div>
                
                <p className={`text-sm font-medium ${sigLevel.color} mb-6 transition-colors duration-300`}>
                  {sigLevel.label}
                </p>

                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 ${
                      i < sigLevel.count 
                        ? `${sigLevel.border} ${sigLevel.bg}` 
                        : 'border-md-outline/10 bg-md-surface-container-low opacity-60'
                    }`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        i < sigLevel.count ? `${sigLevel.color} bg-white/40` : 'text-md-on-surface-variant bg-md-surface-container'
                      }`}>
                        {i + 1}
                      </div>
                      <span className={`text-sm font-medium ${i < sigLevel.count ? 'text-md-on-surface' : 'text-md-on-surface-variant'}`}>
                        {i === 0 ? 'Initiator' : i === 1 ? 'Secondary Admin' : 'Director / Exec'}
                      </span>
                      {i < sigLevel.count && (
                         <CheckCircle className={`w-4 h-4 ml-auto ${sigLevel.color}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-md-surface-container border border-md-outline/10 rounded-3xl p-6 shadow-sm">
              <div className="flex gap-3 text-md-on-surface-variant">
                <Info className="w-5 h-5 flex-shrink-0 text-md-primary" />
                <p className="text-xs leading-relaxed font-medium">
                  All transfers are subjected to anti-fraud AI screening before reaching the first authorization queue. Transfers above $50k undergo manual compliance checks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
