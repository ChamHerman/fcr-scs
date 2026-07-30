import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Ban, 
  Search,
  AlertTriangle,
  History,
  Info,
  Lock,
  Wallet
} from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { blockchainApi } from '../../services/blockchainApi';
import { useWallet } from '../../hooks/useWallet';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { Textarea } from '../../components/ui/Textarea';

export const VoidLedger: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [selectedCase, setSelectedCase] = useState<string | null>(searchParams.get('caseId') || null);
  const [justification, setJustification] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);
  const { walletAddress, walletConnected, error: walletError, setError: setWalletError, connectWallet } = useWallet();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successTx, setSuccessTx] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo(pageRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.35, ease: 'power2.out' }
    );
    gsap.fromTo('.void-left-col > *',
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.45, stagger: 0.1, ease: 'back.out(1.2)', delay: 0.15 }
    );
    gsap.fromTo('.void-right-col',
      { opacity: 0, x: 30 },
      { opacity: 1, x: 0, duration: 0.45, ease: 'power2.out', delay: 0.25 }
    );
  }, { scope: pageRef });

  const loadPublishedRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await blockchainApi.getRecords('Published');
      setRecords(res.records || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load published records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPublishedRecords();
  }, []);

  const handleVoidClick = (id: string) => {
    setSelectedCase(id);
    setJustification('');
    setError('');
    setSuccessTx('');
  };

  const confirmVoid = async () => {
    if (!selectedCase) return;
    if (!justification.trim()) {
      setError('Void reason is required');
      return;
    }
    if (!walletAddress) {
      setError('Please connect MetaMask wallet first');
      return;
    }

    setIsVoiding(true);
    setError('');
    try {
      const res = await blockchainApi.voidRecord({
        caseId: selectedCase,
        voidReason: justification.trim(),
        walletAddress
      });
      setSuccessTx(res.transactionHash);
      setTimeout(() => {
        setIsVoiding(false);
        setSelectedCase(null);
        setJustification('');
        loadPublishedRecords();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to void record');
      setIsVoiding(false);
    }
  };

  const filteredRecords = records.filter(c => 
    !searchQuery || c.caseId.toLowerCase().includes(searchQuery.toLowerCase()) || (c.transactionHash && c.transactionHash.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedRecordObj = records.find(r => r.caseId === selectedCase);

  return (
    <div className="text-md-on-surface p-8 font-sans" ref={pageRef}>
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: List */}
        <div className="lg:w-1/2 space-y-6 void-left-col">
          <div className="bg-md-surface-container backdrop-blur-md border border-md-outline/20 p-6 rounded-3xl relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-64 h-64 bg-md-error rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-md-on-surface flex items-center gap-3 mb-2">
                  <Ban className="w-7 h-7 text-md-on-error" />
                  Void Published Record
                </h1>
                <p className="text-md-on-surface-variant text-sm">
                  Select a previously published record to initiate a voiding transaction on the ledger.
                </p>
              </div>
              <Button 
                onClick={connectWallet}
                variant={walletConnected ? "tonal" : "animated-primary"}
                size="sm"
              >
                <Wallet className="w-3.5 h-3.5 mr-1" />
                {walletAddress ? `${walletAddress.substring(0, 6)}...` : 'Connect'}
              </Button>
            </div>
          </div>

          {loading && <p className="text-gray-500 my-2">Loading...</p>}
          {error && <p className="text-red-500 font-medium my-2">{error}</p>}
          {walletError && <p className="text-red-500 font-medium my-2">{walletError}</p>}
          {successTx && <p className="text-green-600 font-medium my-2">Voided. Tx: {successTx}</p>}

          <div className="relative">
            <SearchInput 
              placeholder="Search published TxHash or Case ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            {filteredRecords.length === 0 ? (
              <p className="text-gray-500 p-4 border border-dashed rounded-2xl text-center">No published records available to void.</p>
            ) : (
              filteredRecords.map((c) => (
                <div 
                  key={c.caseId}
                  onClick={() => handleVoidClick(c.caseId)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ease-md-bouncy shadow-sm ${
                    selectedCase === c.caseId 
                      ? 'bg-md-error border-md-error' 
                      : 'bg-md-surface-container-low border-md-outline/20 hover:bg-md-surface-container'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className={`font-bold text-lg mb-1 ${selectedCase === c.caseId ? 'text-md-on-error' : 'text-md-on-surface'}`}>{c.caseId}</h3>
                      <div className={`flex items-center gap-3 text-sm ${selectedCase === c.caseId ? 'text-md-on-error' : 'text-md-on-surface-variant'}`}>
                        <span className={`flex items-center gap-1 font-mono px-2 py-0.5 rounded ${selectedCase === c.caseId ? 'bg-md-on-error/10 text-md-on-error' : 'text-md-on-surface-variant'}`}>
                          <Lock className="w-3 h-3" />
                          {c.transactionHash ? `${c.transactionHash.substring(0, 12)}...` : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className={`flex items-center text-sm ${selectedCase === c.caseId ? 'text-md-on-error' : 'text-md-on-surface-variant'}`}>
                      <History className="w-4 h-4 mr-1.5" />
                      {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Action Panel */}
        <div className="lg:w-1/2 void-right-col">
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
                  <Textarea
                    label="Justification / Reason Code"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Enter mandatory legal or technical reason for voiding this record..."
                  />
                </div>

                <div className="bg-md-surface-container-low rounded-xl p-4 border border-md-outline/20 space-y-3 text-sm shadow-sm">
                  <div className="flex justify-between">
                    <span className="text-md-on-surface-variant">Operation Type</span>
                    <span className="text-md-on-surface font-mono">APPEND_VOID_BLOCK</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-md-on-surface-variant">Target TxHash</span>
                    <span className="text-md-on-surface font-mono">{selectedRecordObj?.transactionHash ? `${selectedRecordObj.transactionHash.substring(0, 14)}...` : 'N/A'}</span>
                  </div>
                </div>

                <Button 
                  onClick={confirmVoid}
                  disabled={isVoiding || !justification.trim()}
                  variant="animated-primary"
                  className="w-full font-bold shadow-sm"
                  isLoading={isVoiding}
                >
                  <Ban className="w-5 h-5 mr-2" />
                  Confirm Void
                </Button>
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

