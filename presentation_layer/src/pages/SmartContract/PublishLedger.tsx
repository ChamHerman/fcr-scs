import React, { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  FileCheck, 
  UploadCloud, 
  Search, 
  Filter,
  ChevronRight,
  AlertCircle,
  X,
  Wallet
} from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { blockchainApi } from '../../services/blockchainApi';
import { paymentApi } from '../../services/paymentApi';
import { useWallet } from '../../hooks/useWallet';
import { SearchInput } from '../../components/ui/SearchInput';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const PublishLedger: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [selectedCase, setSelectedCase] = useState<string | null>(searchParams.get('caseId') || null);
  const [customCaseId, setCustomCaseId] = useState(searchParams.get('caseId') || '');
  const [customDocHash, setCustomDocHash] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const { walletAddress, walletConnected, error: walletError, setError: setWalletError, connectWallet } = useWallet();
  const [error, setError] = useState('');
  const [successTx, setSuccessTx] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const pageRef = useRef<HTMLDivElement>(null);

  const [eligibleCases, setEligibleCases] = useState<any[]>([]);

  useGSAP(() => {
    gsap.fromTo('.publish-header',
      { opacity: 0, y: -24 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
    );
    gsap.fromTo('.publish-form-section',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.2)', delay: 0.2 }
    );
    gsap.fromTo('.publish-table-section',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', delay: 0.35 }
    );
  }, { scope: pageRef });

  React.useEffect(() => {
    paymentApi.getAllCases().then((res) => {
      // Assuming res.cases has cases that are eligible to be published (e.g. Paid)
      const valid = (res.cases || []).filter((c: any) => c.status === 'Paid' || c.status === 'Approved');
      setEligibleCases(
        valid.map((c: any) => ({
          id: c.caseId,
          client: c.accountHolderName || 'N/A',
          amount: `RM ${c.amount?.toLocaleString() || 0}`,
          date: new Date(c.updatedAt || c.createdAt).toLocaleDateString(),
          status: 'Verified',
          hash: c.encryptedBankDetails || '0xmockhash',
        }))
      );
    }).catch(console.error);
  }, []);

  const handlePublishClick = (id: string, hash?: string) => {
    setSelectedCase(id);
    setCustomCaseId(id);
    setCustomDocHash(hash || '0x' + Array(64).fill('a').join(''));
    setError('');
    setSuccessTx('');
    setIsModalOpen(true);
  };

  const confirmPublish = async () => {
    const caseId = selectedCase || customCaseId;
    const documentHash = customDocHash;

    if (!caseId) {
      setError('Case ID is required');
      return;
    }
    if (!documentHash) {
      setError('Document hash is required');
      return;
    }
    if (!walletAddress) {
      setError('Please connect MetaMask wallet first');
      return;
    }

    setIsPublishing(true);
    setError('');
    try {
      const res = await blockchainApi.publish({
        caseId,
        documentHash,
        walletAddress
      });
      setSuccessTx(res.transactionHash);
      setTimeout(() => {
        setIsModalOpen(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to publish record');
    } finally {
      setIsPublishing(false);
    }
  };

  const filteredCases = eligibleCases.filter(c => 
    !searchQuery || c.id.toLowerCase().includes(searchQuery.toLowerCase()) || c.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="text-md-on-surface p-8 font-sans" ref={pageRef}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-md-surface-container border border-md-outline/20 p-8 rounded-3xl relative overflow-hidden shadow-sm publish-header">
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
            <div>
              <Button 
                onClick={connectWallet}
                variant={walletConnected ? "tonal" : "animated-primary"}
              >
                <Wallet className="w-4 h-4 mr-2" />
                {walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : 'Connect MetaMask'}
              </Button>
            </div>
          </div>
        </div>

        {error && <p className="text-red-500 font-medium my-2">{error}</p>}
        {walletError && <p className="text-red-500 font-medium my-2">{walletError}</p>}
        {successTx && <p className="text-green-600 font-medium my-2">Published. Tx: {successTx}</p>}

        {/* Custom Input Form */}
        <div className="bg-md-surface-container-low p-6 rounded-2xl border border-md-outline/20 space-y-4 publish-form-section">
          <h2 className="text-lg font-bold">Publish Custom Case Record</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Case ID"
              placeholder="e.g. CASE-2026-001"
              value={customCaseId}
              onChange={(e) => setCustomCaseId(e.target.value)}
            />
            <Input 
              label="Document Hash (64 hex chars)"
              placeholder="0x..."
              value={customDocHash}
              onChange={(e) => setCustomDocHash(e.target.value)}
            />
          </div>
          <div className="pt-2">
            <Button 
              onClick={() => handlePublishClick(customCaseId, customDocHash)}
              disabled={!customCaseId || !customDocHash}
              variant="filled"
            >
              Publish Record
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-md-surface-container-low p-4 rounded-2xl border border-md-outline/20 backdrop-blur-md shadow-sm">
          <div className="flex w-full sm:w-96">
            <SearchInput 
              placeholder="Search by case ID or client..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-md-surface-container backdrop-blur-xl border border-md-outline/20 rounded-2xl overflow-hidden shadow-sm publish-table-section">
          <div className="overflow-x-auto">
            <table className="text-left border-collapse w-full">
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
                {filteredCases.map((c) => (
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
                      <Button 
                        onClick={() => handlePublishClick(c.id, c.hash)}
                        variant="filled"
                        size="sm"
                      >
                        Publish
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
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
          <div className="relative bg-md-surface-container border border-md-outline/20 rounded-3xl max-w-md shadow-md overflow-hidden transform transition-all">
            
            <div className="absolute top-0 left-0 h-1 bg-md-primary"></div>
            
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
                  <p className="opacity-90">Publishing case <strong className="font-bold">{selectedCase || customCaseId}</strong> to the ledger cannot be undone.</p>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              {successTx && <p className="text-green-600 text-sm mb-4">Published. Tx: {successTx}</p>}

              <div className="flex gap-3 justify-end">
                <Button 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPublishing}
                  variant="text"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmPublish}
                  disabled={isPublishing}
                  variant="animated-primary"
                  isLoading={isPublishing}
                >
                  Confirm & Publish
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

