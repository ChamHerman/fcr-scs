import React, { useState } from 'react';
import { 
  Ban, 
  Search,
  AlertTriangle,
  History,
  Info,
  Lock
} from 'lucide-react';

export const VoidLedger: React.FC = () => {
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [justification, setJustification] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  const publishedCases = [
    { id: 'CASE-2026-802', txHash: '0x1a2b...3c4d', date: 'Oct 15, 2026' },
    { id: 'CASE-2026-790', txHash: '0x9f8e...7d6c', date: 'Oct 12, 2026' },
    { id: 'CASE-2026-754', txHash: '0x4b5a...6f7e', date: 'Oct 05, 2026' },
  ];

  const handleVoidClick = (id: string) => {
    setSelectedCase(id);
    setJustification('');
  };

  const confirmVoid = () => {
    if (!justification.trim()) return;
    setIsVoiding(true);
    setTimeout(() => {
      setIsVoiding(false);
      setSelectedCase(null);
      setJustification('');
    }, 2000);
  };

  return (
    <div className="text-md-on-surface p-8 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: List */}
        <div className="lg:w-1/2 space-y-6">
          <div className="bg-md-surface-container backdrop-blur-md border border-md-outline/20 p-6 rounded-3xl relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-64 h-64 bg-md-error rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <div className="relative z-10">
              <h1 className="text-2xl font-bold text-md-on-surface flex items-center gap-3 mb-2">
                <Ban className="w-7 h-7 text-md-on-error" />
                Void Published Record
              </h1>
              <p className="text-md-on-surface-variant text-sm">
                Select a previously published record to initiate a voiding transaction on the ledger.
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-md-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Search published TxHash or Case ID..." 
              className="bg-md-surface-container-low backdrop-blur-md border border-md-outline/30 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-md-primary focus:ring-1 focus:ring-md-primary transition-all text-md-on-surface placeholder-md-on-surface-variant shadow-sm"
            />
          </div>

          <div className="space-y-3">
            {publishedCases.map((c) => (
              <div 
                key={c.id}
                onClick={() => handleVoidClick(c.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ease-md-bouncy shadow-sm ${
                  selectedCase === c.id 
                    ? 'bg-md-error border-md-error' 
                    : 'bg-md-surface-container-low border-md-outline/20 hover:bg-md-surface-container'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`font-bold text-lg mb-1 ${selectedCase === c.id ? 'text-md-on-error' : 'text-md-on-surface'}`}>{c.id}</h3>
                    <div className={`flex items-center gap-3 text-sm ${selectedCase === c.id ? 'text-md-on-error' : 'text-md-on-surface-variant'}`}>
                      <span className={`flex items-center gap-1 font-mono px-2 py-0.5 rounded ${selectedCase === c.id ? 'bg-md-on-error/10 text-md-on-error' : 'text-md-on-surface-variant'}`}>
                        <Lock className="w-3 h-3" />
                        {c.txHash}
                      </span>
                    </div>
                  </div>
                  <div className={`flex items-center text-sm ${selectedCase === c.id ? 'text-md-on-error' : 'text-md-on-surface-variant'}`}>
                    <History className="w-4 h-4 mr-1.5" />
                    {c.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Action Panel */}
        <div className="lg:w-1/2">
          {selectedCase ? (
            <div className="bg-md-surface-container backdrop-blur-xl border border-md-outline/20 rounded-3xl p-8 sticky top-8 shadow-md">
              
              <div className="flex items-start gap-4 mb-8">
                <div className="p-4 bg-md-error rounded-2xl text-md-on-error mt-1 border border-md-error/50">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-md-on-surface mb-2">Initiate Void Sequence</h2>
                  <p className="text-md-on-surface-variant text-sm">
                    You are about to issue a cryptographic void for <strong className="text-md-on-surface font-bold">{selectedCase}</strong>. 
                    This will append a nullification block to the ledger.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-md-on-surface mb-2 flex items-center gap-2">
                    Justification / Reason Code
                    <Info className="w-4 h-4 text-md-on-surface-variant" />
                  </label>
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Enter mandatory legal or technical reason for voiding this record..."
                    className="h-32 border border-md-outline/30 rounded-xl p-4 focus:outline-none focus:border-md-primary focus:ring-1 focus:ring-md-primary transition-all text-md-on-surface placeholder-md-on-surface-variant resize-none shadow-sm"
                  ></textarea>
                </div>

                <div className="bg-md-surface-container-low rounded-xl p-4 border border-md-outline/20 space-y-3 text-sm shadow-sm">
                  <div className="flex justify-between">
                    <span className="text-md-on-surface-variant">Operation Type</span>
                    <span className="text-md-on-surface font-mono">APPEND_VOID_BLOCK</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-md-on-surface-variant">Target TxHash</span>
                    <span className="text-md-on-surface font-mono">0x1a2b...3c4d</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-md-on-surface-variant">Est. Gas Fee</span>
                    <span className="text-md-on-surface">0.0012 ETH</span>
                  </div>
                </div>

                <button 
                  onClick={confirmVoid}
                  disabled={isVoiding || !justification.trim()}
                  className="py-4 bg-md-primary hover:opacity-90 disabled:bg-md-surface-container-low disabled:text-md-on-surface-variant disabled:opacity-50 text-md-on-primary rounded-full font-bold shadow-sm transition-all flex justify-center items-center gap-2 active:scale-95 ease-md-bouncy"
                >
                  {isVoiding ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Broadcasting Transaction...
                    </>
                  ) : (
                    <>
                      <Ban className="w-5 h-5" />
                      Confirm Void
                    </>
                  )}
                </button>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-md-outline/30 rounded-3xl text-md-on-surface-variant">
              <div className="p-4 bg-md-surface-container rounded-full mb-4">
                <Search className="w-8 h-8 text-md-on-surface-variant" />
              </div>
              <h3 className="text-lg font-medium text-md-on-surface mb-2">No Record Selected</h3>
              <p className="text-sm max-w-xs">
                Select a published record from the list to view details and initiate a void transaction.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
