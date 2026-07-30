import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertOctagon, RotateCcw, XCircle, FileWarning, 
  Search, ChevronRight, Activity, HelpCircle,
  Banknote, ArrowRightLeft, FileX
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { paymentApi } from '../../services/paymentApi';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';

export default function FailedTransactions() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('caseId') || '');
  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.failed-header',
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
    );
    gsap.fromTo('.failed-table-wrap',
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.2)', delay: 0.2 }
    );
  }, { scope: pageRef });

  const loadFailedCases = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await paymentApi.getFailedTransactions();
      setCases(res.cases || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load failed transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFailedCases();
  }, []);

  const handleRetry = async (caseId: string) => {
    setLoading(true);
    setError('');
    setActionMessage('');
    try {
      await paymentApi.retry(caseId);
      setActionMessage(`Retry initiated for case ${caseId}`);
      await loadFailedCases();
    } catch (err: any) {
      setError(err.message || 'Failed to retry payment');
      setLoading(false);
    }
  };

  const handleRequestUpdate = async (caseId: string) => {
    setLoading(true);
    setError('');
    setActionMessage('');
    try {
      await paymentApi.requestDetailsUpdate(caseId);
      setActionMessage(`Requested bank details update for case ${caseId}`);
      await loadFailedCases();
    } catch (err: any) {
      setError(err.message || 'Failed to request update');
      setLoading(false);
    }
  };

  const handleScheduleTomorrow = async (caseId: string) => {
    setLoading(true);
    setError('');
    setActionMessage('');
    try {
      await paymentApi.scheduleTomorrow(caseId);
      setActionMessage(`Scheduled transfer for tomorrow for case ${caseId}`);
      await loadFailedCases();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule payment');
      setLoading(false);
    }
  };

  const filteredCases = cases.filter(c => 
    !searchQuery || c.caseId.toLowerCase().includes(searchQuery.toLowerCase()) || (c.accountHolderName && c.accountHolderName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="text-md-on-surface p-8 relative overflow-hidden font-sans" ref={pageRef}>
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 failed-header">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-md-error rounded-2xl">
              <AlertOctagon className="w-6 h-6 text-md-on-error" />
            </div>
            <div>
              <h1 className="text-3xl font-medium tracking-tight text-md-on-surface mb-1">Resolution Center</h1>
              <p className="text-md-on-surface-variant text-sm">Investigate and resolve failed transactions and bank rejections.</p>
            </div>
          </div>
        </div>

        {loading && <p className="text-gray-500 my-4">Loading...</p>}
        {error && <p className="text-red-500 font-medium my-4">{error}</p>}
        {actionMessage && <p className="text-green-600 font-medium my-4">{actionMessage}</p>}

        {/* Failed Logs Table */}
        <div className="bg-md-surface-container rounded-[32px] shadow-sm border border-md-outline/5 overflow-hidden failed-table-wrap">
          <div className="p-6 border-b border-md-outline/10 flex flex-col sm:flex-row gap-4 justify-between items-center bg-md-surface-container-low/30">
            <h2 className="text-lg font-medium text-md-on-surface flex items-center gap-3">
              <div className="p-1.5 bg-md-error rounded-xl">
                <FileWarning className="w-5 h-5 text-md-on-error" />
              </div>
              Failed Transaction Logs ({filteredCases.length})
            </h2>
              <SearchInput 
                placeholder="Search error code or Case ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
          </div>

          <div className="divide-y divide-md-outline/10">
            {filteredCases.length === 0 ? (
              <p className="text-gray-500 p-6 text-center">No failed transactions requiring resolution.</p>
            ) : (
              filteredCases.map((c) => (
                <div key={c.id || c.caseId} className="p-6 hover:bg-md-surface-container-low/50 transition-colors group flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-md-error text-md-on-error rounded-lg text-xs font-mono font-medium">
                        {c.status || 'FAILED'}
                      </span>
                      <span className="text-sm text-md-on-surface-variant flex items-center gap-2">
                        Case ID: <span className="text-md-on-surface font-mono">{c.caseId}</span>
                      </span>
                      <span className="text-xs text-md-on-surface-variant flex items-center gap-1 ml-auto lg:ml-0 font-medium bg-md-surface-container-low px-2 py-1 rounded-md">
                        {new Date(c.updatedAt || c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-md-on-surface leading-relaxed">
                      Beneficiary: {c.accountHolderName || 'N/A'} ({c.bankName || 'Bank'}) — {c.failedTransactions?.[0]?.reason || 'Bank processing error'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 border-md-outline/10 pt-5 lg:pt-0 mt-5 lg:mt-0">
                    <div className="text-right">
                      <div className="text-sm text-md-on-surface-variant mb-1 font-medium font-mono">Amount</div>
                      <div className="font-semibold text-md-on-surface text-lg tracking-tight">RM {(c.amount || 0).toLocaleString()}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        onClick={() => handleRetry(c.caseId)}
                        variant="filled"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Retry
                      </Button>
                      <Button 
                        onClick={() => handleRequestUpdate(c.caseId)}
                        variant="tonal"
                        size="sm"
                      >
                        Request Update
                      </Button>
                      <Button 
                        onClick={() => handleScheduleTomorrow(c.caseId)}
                        variant="tonal"
                        size="sm"
                      >
                        Schedule Tomorrow
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

