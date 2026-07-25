import React, { useState } from 'react';
import { CheckCircle2, Download, Clock, Activity, FileText, Banknote, ShieldAlert } from 'lucide-react';

export default function MemberPaymentStatus() {
  const [currentStep] = useState(2); // 0: Init, 1: Processed, 2: Transferring, 3: Completed

  const steps = [
    { title: 'Claim Approved', description: 'Your claim has been officially approved.', icon: FileText, date: 'Oct 24, 10:00 AM' },
    { title: 'Funds Allocated', description: 'Compensation funds secured in escrow.', icon: Banknote, date: 'Oct 25, 02:15 PM' },
    { title: 'Bank Transfer Initiated', description: 'Transferring to account ending in **5555**.', icon: Activity, date: 'In Progress' },
    { title: 'Payment Completed', description: 'Funds successfully deposited.', icon: CheckCircle2, date: 'Pending' },
  ];

  return (
    <div className="bg-[var(--md-background)] p-4 sm:p-6 font-sans text-slate-900 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <header className="mb-8 mt-4 sm:mt-8 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Payment Status
          </h1>
          <p className="text-slate-600 mt-2">Track the real-time progress of your compensation.</p>
        </header>

        <div className="bg-[var(--md-surface-container)] rounded-[2rem] p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-[var(--md-primary)]" />
                Live Tracker
              </h2>
              <span className="px-3 py-1 bg-[var(--md-primary)]/10 text-[var(--md-primary)] rounded-full text-xs font-medium animate-pulse">
                Processing
              </span>
            </div>

            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[1.125rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-300">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                const isPending = index > currentStep;

                let iconColor = isCompleted ? 'bg-[var(--md-primary)] text-white' : isCurrent ? 'bg-[var(--md-primary)] text-white shadow-sm' : 'bg-slate-200 text-slate-500';
                
                return (
                  <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 z-10 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-colors duration-300 ${iconColor}`}>
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                    </div>
                    
                    <div className={`w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl transition-all duration-300 ${isCurrent ? 'bg-[var(--md-background)] shadow-sm border border-slate-200' : 'bg-[var(--md-background)]/50'} ${isPending ? 'opacity-60' : 'opacity-100'}`}>
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-1 gap-2">
                        <h3 className={`font-semibold ${isCurrent ? 'text-[var(--md-primary)]' : 'text-slate-700'}`}>{step.title}</h3>
                        <span className="text-xs text-slate-500 whitespace-nowrap">{step.date}</span>
                      </div>
                      <p className="text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: step.description.replace('**5555**', '<span class="text-slate-900 font-medium">5555</span>') }}></p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <button className="flex-1 bg-[var(--md-surface-container)] hover:bg-[var(--md-secondary-container)] text-slate-900 py-4 px-6 rounded-3xl flex items-center justify-center gap-3 transition-all group shadow-sm hover:-translate-y-0.5">
            <div className="p-2 bg-[var(--md-background)] rounded-full group-hover:bg-[var(--md-surface-container)] transition-colors">
              <Download className="w-5 h-5 text-[var(--md-primary)]" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">Download Receipt</div>
              <div className="text-xs text-slate-600">PDF Document</div>
            </div>
          </button>
          
          <button className="flex-1 bg-[#FFD8E4] hover:bg-[#FFB4AB] text-[#31111D] py-4 px-6 rounded-3xl flex items-center justify-center gap-3 transition-all group shadow-sm hover:-translate-y-0.5">
            <div className="p-2 bg-[var(--md-background)]/50 rounded-full group-hover:bg-[var(--md-background)]/80 transition-colors">
              <ShieldAlert className="w-5 h-5 text-[#B3261E]" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">Report Missing Funds</div>
              <div className="text-xs text-[#8C1D18]">Dispute Resolution</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
