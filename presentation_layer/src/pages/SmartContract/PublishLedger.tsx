import React, { useState } from 'react';
import { 
  FileCheck, 
  UploadCloud, 
  Search, 
  Filter,
  ChevronRight,
  AlertCircle,
  X
} from 'lucide-react';

export const PublishLedger: React.FC = () => {
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const eligibleCases = [
    { id: 'CASE-2026-891', client: 'Acme Corp', amount: '$45,000', date: 'Oct 24, 2026', status: 'Verified' },
    { id: 'CASE-2026-892', client: 'Globex Inc', amount: '$12,500', date: 'Oct 23, 2026', status: 'Verified' },
    { id: 'CASE-2026-894', client: 'Initech', amount: '$8,200', date: 'Oct 21, 2026', status: 'Verified' },
    { id: 'CASE-2026-895', client: 'Soylent Corp', amount: '$150,000', date: 'Oct 20, 2026', status: 'Verified' },
  ];

  const handlePublishClick = (id: string) => {
    setSelectedCase(id);
    setIsModalOpen(true);
  };

  const confirmPublish = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setIsModalOpen(false);
      setSelectedCase(null);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-md-background text-md-on-surface p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-md-surface-container border border-md-outline/20 p-8 rounded-3xl relative overflow-hidden shadow-sm">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-md-secondary-container rounded-full blur-3xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-md-on-surface flex items-center gap-3">
                <UploadCloud className="w-8 h-8 text-md-primary" />
                Publish to Ledger
              </h1>
              <p className="text-md-on-surface-variant mt-2 max-w-xl">
                Review verified cases and permanently anchor them to the blockchain. This action is immutable.
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-md-surface-container-low p-4 rounded-2xl border border-md-outline/20 backdrop-blur-md shadow-sm">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-md-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Search by case ID or client..." 
              className="w-full bg-md-background border border-md-outline/30 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-md-primary focus:ring-1 focus:ring-md-primary transition-all text-md-on-surface placeholder-md-on-surface-variant"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-md-surface-container hover:bg-md-secondary-container border border-md-outline/20 rounded-full text-sm font-medium transition-all active:scale-95 ease-md-bouncy w-full sm:w-auto justify-center text-md-on-surface">
            <Filter className="w-4 h-4" />
            Filter Cases
          </button>
        </div>

        {/* Data Table */}
        <div className="bg-md-surface-container backdrop-blur-xl border border-md-outline/20 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-md-surface-container-low border-b border-md-outline/20 text-sm font-medium text-md-on-surface-variant">
                  <th className="p-4 pl-6 whitespace-nowrap">Case ID</th>
                  <th className="p-4 whitespace-nowrap">Client</th>
                  <th className="p-4 whitespace-nowrap">Amount</th>
                  <th className="p-4 whitespace-nowrap">Verification Date</th>
                  <th className="p-4 whitespace-nowrap">Status</th>
                  <th className="p-4 pr-6 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-md-outline/10">
                {eligibleCases.map((c) => (
                  <tr key={c.id} className="hover:bg-md-surface-container-low transition-colors group">
                    <td className="p-4 pl-6 font-medium text-md-primary">{c.id}</td>
                    <td className="p-4 text-md-on-surface">{c.client}</td>
                    <td className="p-4 text-md-on-surface font-mono">{c.amount}</td>
                    <td className="p-4 text-md-on-surface-variant">{c.date}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-md-secondary-container text-md-on-secondary-container border border-md-outline/20">
                        <FileCheck className="w-3 h-3" />
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button 
                        onClick={() => handlePublishClick(c.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-md-primary hover:opacity-90 text-md-on-primary rounded-full text-sm font-medium transition-all shadow-sm active:scale-95 ease-md-bouncy opacity-90 group-hover:opacity-100"
                      >
                        Publish
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-md-on-surface/50 backdrop-blur-sm" onClick={() => !isPublishing && setIsModalOpen(false)}></div>
          <div className="relative bg-md-surface-container border border-md-outline/20 rounded-3xl w-full max-w-md shadow-md overflow-hidden transform transition-all">
            
            <div className="absolute top-0 left-0 w-full h-1 bg-md-primary"></div>
            
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-md-secondary-container rounded-xl text-md-on-secondary-container border border-md-outline/10">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-md-on-surface">Confirm Publishing</h3>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPublishing}
                  className="text-md-on-surface-variant hover:text-md-on-surface transition-colors p-1 rounded-full hover:bg-md-secondary-container active:scale-95 ease-md-bouncy"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-md-warning border border-md-warning/50 rounded-xl p-4 mb-6 flex gap-3 shadow-sm">
                <AlertCircle className="w-5 h-5 text-md-on-warning shrink-0 mt-0.5" />
                <div className="text-sm text-md-on-warning">
                  <p className="font-semibold mb-1">Immutable Action Warning</p>
                  <p className="opacity-90">Publishing case <strong className="font-bold">{selectedCase}</strong> to the ledger cannot be undone. Gas fees will be applied to your connected wallet.</p>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPublishing}
                  className="px-5 py-2.5 rounded-full font-medium text-md-on-surface hover:bg-md-secondary-container transition-all active:scale-95 ease-md-bouncy disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmPublish}
                  disabled={isPublishing}
                  className="relative px-5 py-2.5 bg-md-primary hover:opacity-90 text-md-on-primary rounded-full font-medium shadow-sm transition-all active:scale-95 ease-md-bouncy overflow-hidden flex items-center justify-center min-w-[140px]"
                >
                  {isPublishing ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-md-on-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Publishing...
                    </div>
                  ) : (
                    'Confirm & Publish'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
