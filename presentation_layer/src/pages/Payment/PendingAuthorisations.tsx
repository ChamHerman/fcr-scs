import React, { useState } from 'react';
import { 
  Shield, Key, CheckCircle, XCircle, Clock, 
  AlertTriangle, ArrowRight, Fingerprint, Lock, 
  ExternalLink, Search
} from 'lucide-react';

const pendingList = [
  { id: 'TRX-99021', caseId: 'CAS-2026-119', amount: '$45,000.00', initiator: 'Sarah J.', level: '2/3', risk: 'Medium', timeAgo: '15m ago' },
  { id: 'TRX-99022', caseId: 'CAS-2026-084', amount: '$12,500.00', initiator: 'Mike T.', level: '1/2', risk: 'Low', timeAgo: '1h ago' },
  { id: 'TRX-99025', caseId: 'CAS-2026-231', amount: '$150,000.00', initiator: 'Elena R.', level: '2/3', risk: 'High', timeAgo: '2h ago' },
];

export default function PendingAuthorisations() {
  const [selectedTrx, setSelectedTrx] = useState(pendingList[0]);

  return (
    <div className="text-md-on-surface p-8 relative overflow-hidden font-sans">
      {/* Security Theme Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-md-primary/5 via-md-background to-md-background pointer-events-none" />
      <div className="absolute top-20 right-20 w-[500px] h-[500px] bg-md-warning/20 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 max-w-7xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-md-warning rounded-2xl">
              <Shield className="w-6 h-6 text-md-on-warning" />
            </div>
            <div>
              <h1 className="text-3xl font-medium text-md-on-surface tracking-tight mb-1">Authorization Queue</h1>
              <p className="text-md-on-surface-variant text-sm">Secure approval environment. MFA required for final sign-off.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-5 py-2.5 bg-md-warning rounded-full text-sm font-medium text-md-on-warning shadow-sm">
            <Lock className="w-4 h-4" />
            End-to-End Encrypted Session
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          
          {/* Left Panel: List */}
          <div className="lg:col-span-4 bg-md-surface-container border border-md-outline/10 rounded-[32px] overflow-hidden flex flex-col shadow-sm">
            <div className="p-5 border-b border-md-outline/10 bg-md-surface-container-low/30">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-md-on-surface-variant" />
                <input 
                  type="text" 
                  placeholder="Filter by ID or Case..." 
                  className="bg-md-surface-container-low border border-md-outline/20 rounded-full pl-11 pr-4 py-3 text-sm text-md-on-surface placeholder:text-md-on-surface-variant/70 focus:outline-none focus:border-md-primary focus:ring-1 focus:ring-md-primary transition-all"
                />
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 p-3 space-y-2 custom-scrollbar">
              {pendingList.map((trx) => (
                <button
                  key={trx.id}
                  onClick={() => setSelectedTrx(trx)}
                  className={`text-left p-4 rounded-[24px] transition-all duration-300 ease-md-bouncy active:scale-95 ${
                    selectedTrx.id === trx.id 
                      ? 'bg-md-surface-container-low border-md-primary/30 shadow-sm' 
                      : 'bg-transparent border-transparent hover:bg-md-surface-container-low/50'
                  } border`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-mono font-medium text-md-primary">{trx.id}</span>
                    <span className="text-xs text-md-on-surface-variant">{trx.timeAgo}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-lg font-semibold text-md-on-surface mb-1">{trx.amount}</div>
                      <div className="text-xs text-md-on-surface-variant">Initiated by {trx.initiator}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                        trx.risk === 'High' ? 'bg-md-error text-md-on-error' :
                        trx.risk === 'Medium' ? 'bg-md-warning text-md-on-warning' :
                        'bg-md-success text-md-on-success'
                      }`}>
                        {trx.risk} Risk
                      </span>
                      <span className="text-xs font-medium text-md-on-surface-variant bg-md-surface-container px-2 py-0.5 rounded-lg border border-md-outline/10">
                        Sig {trx.level}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel: Details & Actions */}
          <div className="lg:col-span-8 bg-md-surface-container border border-md-outline/10 rounded-[32px] p-8 flex flex-col shadow-sm">
            {selectedTrx ? (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-8 pb-6 border-b border-md-outline/10">
                  <div>
                    <h2 className="text-3xl font-semibold text-md-on-surface mb-3">{selectedTrx.amount} USD</h2>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-md-on-surface-variant">Transaction ID:</span>
                      <span className="font-mono text-md-on-warning bg-md-warning px-2.5 py-1 rounded-lg border border-md-warning/30 font-medium">{selectedTrx.id}</span>
                    </div>
                  </div>
                  <button className="flex items-center gap-2 text-sm text-md-primary bg-md-primary/10 hover:bg-md-primary/20 px-5 py-2.5 rounded-full transition-colors ease-md-bouncy active:scale-95 font-medium">
                    View Full Case <ExternalLink className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-auto">
                  <div className="space-y-6">
                    <div className="bg-md-surface-container-low rounded-3xl p-6 border border-md-outline/5">
                      <h3 className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider mb-5">Beneficiary Details</h3>
                      <div className="space-y-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-md-on-surface-variant">Account Name</span>
                          <span className="font-medium text-md-on-surface">Global Logistics Ltd.</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-md-on-surface-variant">Bank Name</span>
                          <span className="font-medium text-md-on-surface">JPMorgan Chase</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-md-on-surface-variant">Routing / Swift</span>
                          <span className="font-mono text-md-on-surface">CHASUS33XXX</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-md-surface-container-low rounded-3xl p-6 border border-md-outline/5 relative overflow-hidden">
                      {selectedTrx.risk === 'High' && (
                        <div className="absolute top-0 right-0 w-24 h-24 bg-md-error/30 rounded-full blur-2xl -mr-10 -mt-10" />
                      )}
                      <h3 className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider mb-5">Security Assessment</h3>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${selectedTrx.risk === 'High' ? 'text-rose-600' : 'text-amber-600'}`} />
                        <p className="text-sm text-md-on-surface leading-relaxed">
                          {selectedTrx.risk === 'High' 
                            ? 'Flagged for unusually high amount compared to historical average for this case type. Director-level sign-off mandatory.'
                            : 'Standard verification passed. Name match confidence is 98%.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-8 mt-8 border-t border-md-outline/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-md-on-surface-variant font-medium">
                      <Fingerprint className="w-5 h-5 text-md-primary" />
                      Biometric or Hardware Key required to sign
                    </div>
                    <div className="flex gap-4">
                      <button className="px-8 py-3.5 bg-md-surface-container-low border border-md-outline/20 hover:bg-md-error hover:text-md-on-error hover:border-transparent rounded-full font-medium text-md-on-surface transition-all duration-300 ease-md-bouncy active:scale-95 shadow-sm">
                        Reject
                      </button>
                      <button className="flex items-center gap-2 px-8 py-3.5 bg-md-primary hover:opacity-90 shadow-sm rounded-full font-medium text-md-on-primary transition-all duration-300 ease-md-bouncy active:scale-95">
                        <Key className="w-5 h-5" />
                        Sign & Authorize
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-md-on-surface-variant">
                <Shield className="w-16 h-16 mb-4 opacity-30" />
                <p>Select a transaction to review</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
