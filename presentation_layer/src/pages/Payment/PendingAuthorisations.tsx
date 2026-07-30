import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Key, CheckCircle, XCircle, Clock, 
  AlertTriangle, ArrowRight, Fingerprint, Lock, 
  ExternalLink, Search
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { paymentApi } from '../../services/paymentApi';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function PendingAuthorisations() {
  const [cases, setCases] = useState<any[]>([]);
  const [selectedTrx, setSelectedTrx] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminId, setAdminId] = useState('admin-02');
  const [actionMessage, setActionMessage] = useState('');
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('caseId') || '');
  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.pending-header',
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
    );
    gsap.fromTo('.pending-list-panel',
      { opacity: 0, x: -30 },
      { opacity: 1, x: 0, duration: 0.45, ease: 'back.out(1.2)', delay: 0.2 }
    );
    gsap.fromTo('.pending-detail-panel',
      { opacity: 0, x: 30 },
      { opacity: 1, x: 0, duration: 0.45, ease: 'back.out(1.2)', delay: 0.2 }
    );
  }, { scope: pageRef });

  const loadPendingCases = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await paymentApi.getPendingAuthorisations();
      const caseList = res.cases || [];
      setCases(caseList);
      
      const prefillCaseId = searchParams.get('caseId');
      if (prefillCaseId) {
        const found = caseList.find((c: any) => c.caseId === prefillCaseId);
        if (found) setSelectedTrx(found);
        else if (caseList.length > 0) setSelectedTrx(caseList[0]);
      } else if (caseList.length > 0) {
        setSelectedTrx(caseList[0]);
      } else {
        setSelectedTrx(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pending authorisations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingCases();
  }, []);

  const handleAuthorise = async () => {
    if (!selectedTrx) return;
    if (!adminId.trim()) {
      setError('Admin ID is required');
      return;
    }

    setLoading(true);
    setError('');
    setActionMessage('');
    try {
      const res = await paymentApi.authorise({
        caseId: selectedTrx.caseId,
        adminId: adminId.trim()
      });
      setActionMessage(`Authorised successfully. Status: ${res.paymentCase?.status || 'Authorised'}`);
      await loadPendingCases();
    } catch (err: any) {
      setError(err.message || 'Failed to authorise transfer');
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTrx) return;
    const reason = window.prompt('Enter rejection reason:');
    if (!reason || !reason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    setLoading(true);
    setError('');
    setActionMessage('');
    try {
      const res = await paymentApi.reject({
        caseId: selectedTrx.caseId,
        adminId: adminId.trim(),
        reason: reason.trim()
      });
      setActionMessage(`Rejected successfully. Status: ${res.paymentCase?.status || 'Rejected'}`);
      await loadPendingCases();
    } catch (err: any) {
      setError(err.message || 'Failed to reject transfer');
      setLoading(false);
    }
  };

  const filteredCases = cases.filter(c => 
    !searchQuery || c.caseId.toLowerCase().includes(searchQuery.toLowerCase()) || (c.accountHolderName && c.accountHolderName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="text-md-on-surface p-8 relative overflow-hidden font-sans" ref={pageRef}>
      <div className="relative z-10 max-w-7xl mx-auto flex flex-col min-h-[500px]">
        
        <div className="flex items-center justify-between mb-8 pending-header">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-md-warning rounded-2xl">
              <Shield className="w-6 h-6 text-md-on-warning" />
            </div>
            <div>
              <h1 className="text-3xl font-medium text-md-on-surface tracking-tight mb-1">Authorization Queue</h1>
              <p className="text-md-on-surface-variant text-sm">Secure approval environment. Multi-signature review queue.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Input 
              label="Admin ID"
              value={adminId} 
              onChange={(e) => setAdminId(e.target.value)}
            />
          </div>
        </div>

        {loading && <p className="text-gray-500 my-4">Loading...</p>}
        {error && <p className="text-red-500 font-medium my-4">{error}</p>}
        {actionMessage && <p className="text-green-600 font-medium my-4">{actionMessage}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          
          {/* Left Panel: List */}
          <div className="lg:col-span-4 bg-md-surface-container border border-md-outline/10 rounded-[32px] overflow-hidden flex flex-col shadow-sm pending-list-panel">
            <div className="p-5 border-b border-md-outline/10 bg-md-surface-container-low/30">
              <div className="flex">
                <SearchInput 
                  placeholder="Filter by ID or Case..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 p-3 space-y-2 custom-scrollbar min-h-[300px]">
              {filteredCases.length === 0 ? (
                <p className="text-gray-500 p-4 text-center">No pending authorisations in queue.</p>
              ) : (
                filteredCases.map((trx) => (
                  <button
                    key={trx.id || trx.caseId}
                    onClick={() => setSelectedTrx(trx)}
                    className={`text-left p-4 rounded-[24px] transition-all duration-300 ease-md-bouncy active:scale-95 w-full ${
                      selectedTrx?.caseId === trx.caseId 
                        ? 'bg-md-surface-container-low border-md-primary/30 shadow-sm' 
                        : 'bg-transparent border-transparent hover:bg-md-surface-container-low/50'
                    } border`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-mono font-medium text-md-primary">{trx.caseId}</span>
                      <span className="text-xs text-md-on-surface-variant">{new Date(trx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-lg font-semibold text-md-on-surface mb-1">RM {(trx.amount || 0).toLocaleString()}</div>
                        <div className="text-xs text-md-on-surface-variant">Beneficiary: {trx.accountHolderName || 'N/A'}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs font-medium text-md-on-surface-variant bg-md-surface-container px-2 py-0.5 rounded-lg border border-md-outline/10">
                          Sigs: {trx.currentSignatures || 1}/{trx.requiredSignatures || 1}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Panel: Details & Actions */}
          <div className="lg:col-span-8 bg-md-surface-container border border-md-outline/10 rounded-[32px] p-8 flex flex-col shadow-sm pending-detail-panel">
            {selectedTrx ? (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-8 pb-6 border-b border-md-outline/10">
                  <div>
                    <h2 className="text-3xl font-semibold text-md-on-surface mb-3">RM {(selectedTrx.amount || 0).toLocaleString()}</h2>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-md-on-surface-variant">Case ID:</span>
                      <span className="font-mono text-md-on-warning bg-md-warning px-2.5 py-1 rounded-lg border border-md-warning/30 font-medium">{selectedTrx.caseId}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-auto">
                  <div className="space-y-6">
                    <div className="bg-md-surface-container-low rounded-3xl p-6 border border-md-outline/5">
                      <h3 className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider mb-5">Beneficiary Details</h3>
                      <div className="space-y-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-md-on-surface-variant">Account Name</span>
                          <span className="font-medium text-md-on-surface">{selectedTrx.accountHolderName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-md-on-surface-variant">Bank Name</span>
                          <span className="font-medium text-md-on-surface">{selectedTrx.bankName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-md-on-surface-variant">Account Number</span>
                          <span className="font-mono text-md-on-surface">{selectedTrx.accountNumber || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-md-surface-container-low rounded-3xl p-6 border border-md-outline/5">
                      <h3 className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wider mb-5">Multi-Sig Progress</h3>
                      <p className="text-sm text-md-on-surface mb-2">
                        Current Signatures: <strong>{selectedTrx.currentSignatures || 1}</strong> of <strong>{selectedTrx.requiredSignatures || 1}</strong> required.
                      </p>
                      <p className="text-xs text-md-on-surface-variant">
                        Segregation of Duties: Approving admin must be different from initiator.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-8 mt-8 border-t border-md-outline/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-md-on-surface-variant font-medium">
                      <Fingerprint className="w-5 h-5 text-md-primary" />
                      Sign as: {adminId}
                    </div>
                    <div className="flex gap-4">
                      <Button 
                        onClick={handleReject}
                        variant="outlined"
                        className="hover:bg-md-error hover:text-md-on-error hover:border-transparent"
                      >
                        Reject
                      </Button>
                      <Button 
                        onClick={handleAuthorise}
                        variant="animated-primary"
                        className="pl-6"
                      >
                        <Key className="w-5 h-5 mr-2" />
                        Sign & Authorize
                      </Button>
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

