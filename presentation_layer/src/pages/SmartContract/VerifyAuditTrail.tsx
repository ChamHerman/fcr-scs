import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, Shield, FileText, Search, RefreshCw, XCircle, FileWarning, ExternalLink } from 'lucide-react';
import { blockchainApi } from '../../services/blockchainApi';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Button } from '../../components/ui/Button';
import { CopyButton } from '../../components/ui/CopyButton';
import { formatDateTime } from '../../utils/dateFormat';

export default function VerifyAuditTrail() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.verify-heading',
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
    );
    gsap.fromTo('.verify-upload-col',
      { opacity: 0, x: -30 },
      { opacity: 1, x: 0, duration: 0.45, ease: 'back.out(1.2)', delay: 0.2 }
    );
    gsap.fromTo('.verify-result-col',
      { opacity: 0, x: 30 },
      { opacity: 1, x: 0, duration: 0.45, ease: 'back.out(1.2)', delay: 0.2 }
    );
  }, { scope: pageRef });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processVerification = async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are accepted for verification.');
      setResult(null);
      return;
    }

    setVerifying(true);
    setError('');
    setResult(null);

    try {
      // Optional client side hash log
      const buffer = await selectedFile.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      console.log("Client-side hash:", fileHash);

      const res = await blockchainApi.verify(selectedFile);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      processVerification(droppedFile);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const chosenFile = e.target.files[0];
      setFile(chosenFile);
      processVerification(chosenFile);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--md-background)] p-4 sm:p-6 font-sans text-slate-900 flex flex-col items-center justify-center" ref={pageRef}>
      <div className="max-w-4xl w-full">
        
        <div className="text-center mb-10 verify-heading">
          <div className="inline-flex items-center justify-center p-4 bg-[var(--md-surface-container)] rounded-full mb-4 shadow-md transition-transform hover:scale-110">
            <Shield className="w-8 h-8 text-[var(--md-primary)]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
            Verify Public Audit Trail
          </h1>
          <p className="text-slate-600 max-w-lg mx-auto">
            Drag and drop a PDF settlement certificate to check its integrity and blockchain status.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          
          {/* Upload Area */}
          <div className="relative group verify-upload-col">
            <div 
              className={`relative h-full bg-[var(--md-surface-container)] border-2 border-dashed rounded-[2rem] p-8 sm:p-12 text-center transition-all duration-300 flex flex-col justify-center shadow-sm hover:shadow-md ${dragActive ? 'border-[var(--md-primary)] bg-[var(--md-secondary-container)] scale-[1.02]' : 'border-slate-300 hover:border-[var(--md-primary)]/50'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input 
                ref={inputRef}
                type="file" 
                className="hidden" 
                accept=".pdf"
                onChange={handleChange}
              />
              
              {!file ? (
                <div className="flex flex-col items-center cursor-pointer" onClick={() => inputRef.current?.click()}>
                  <div className="w-20 h-20 bg-[var(--md-background)] rounded-full flex items-center justify-center mb-6 group-hover:-translate-y-2 group-hover:scale-110 transition-all duration-300 shadow-sm group-hover:shadow-md">
                    <UploadCloud className="w-10 h-10 text-[var(--md-primary)]" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Upload Certificate</h3>
                  <p className="text-sm text-slate-600 mb-6">Drag & drop your PDF file here, or click to browse</p>
                  <span className="px-4 py-2 bg-[var(--md-background)] rounded-full text-xs text-slate-700 font-medium shadow-sm transition-colors hover:bg-slate-50">
                    Supports .PDF format
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-[var(--md-background)] rounded-full flex items-center justify-center mb-6 shadow-md animate-bounce">
                    <FileText className="w-10 h-10 text-[var(--md-primary)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1 truncate w-full max-w-[200px]">{file.name}</h3>
                  <p className="text-xs text-slate-600 mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  
                  {!verifying && (
                    <Button 
                      onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); setError(''); }}
                      variant="text"
                      className="mt-2"
                    >
                      Verify another file
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Verification Status */}
          <div className="bg-[var(--md-surface-container)] rounded-[2rem] p-6 sm:p-8 h-full min-h-[350px] flex flex-col justify-center shadow-md verify-result-col transition-all">
            {!result && !verifying && !error && (
              <div className="text-center opacity-70">
                <Search className="w-12 h-12 text-[var(--md-primary)] mx-auto mb-4 animate-pulse" />
                <p className="text-slate-600 text-sm max-w-[200px] mx-auto">Upload a document to view audit trail.</p>
              </div>
            )}

            {verifying && (
              <div className="text-center space-y-4">
                <RefreshCw className="w-12 h-12 text-[var(--md-primary)] animate-spin mx-auto" />
                <p className="text-slate-800 font-medium animate-pulse">Computing hash & querying blockchain...</p>
              </div>
            )}

            {error && (
              <div className="text-center space-y-3 animate-in zoom-in duration-300">
                <FileWarning className="w-14 h-14 text-red-500 mx-auto" />
                <p className="text-red-500 font-bold text-lg">{error}</p>
                <Button onClick={() => setError('')} variant="text" size="sm" className="mt-2">Dismiss</Button>
              </div>
            )}

            {result && (
              <div className="animate-in fade-in zoom-in duration-500 text-center space-y-4">
                <div className="w-20 h-20 bg-[var(--md-background)] rounded-full flex items-center justify-center mx-auto shadow-md transform hover:rotate-12 transition-transform">
                  {result.verified ? (
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  ) : result.status === 'Voided' ? (
                    <XCircle className="w-12 h-12 text-orange-500" />
                  ) : (
                    <XCircle className="w-12 h-12 text-red-500" />
                  )}
                </div>
                
                <h3 className={`text-2xl font-bold tracking-tight ${result.verified ? 'text-green-600' : result.status === 'Voided' ? 'text-orange-500' : 'text-red-500'}`}>
                  {result.verified ? 'Success: Authentic' : result.status === 'Voided' ? 'Document Voided' : 'Altered / Invalid'}
                </h3>
                
                <p className={`text-sm font-medium px-4 py-2 rounded-full inline-block ${result.verified ? 'bg-green-100 text-green-700' : result.status === 'Voided' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                  {result.message || result.status}
                </p>
                
                <div className="bg-[var(--md-background)] rounded-2xl p-5 text-left shadow-sm hover:shadow-md transition-shadow space-y-2.5 text-sm mt-4 border border-slate-100">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-slate-500">Status</span>
                    <span className={`font-semibold px-2.5 py-0.5 rounded-md text-xs ${
                      result.verified ? 'bg-green-100 text-green-800' : result.status === 'Voided' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {result.status || 'Unknown'}
                    </span>
                  </div>

                  {result.milestone && (
                    <div className="pb-2 border-b border-slate-100">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Milestone</span>
                        <span className="font-semibold text-slate-800 text-xs">
                          {result.milestone === 'M1' ? 'M1 — Statutory Award (Form H)' : 'M2 — Settlement (Receipt)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {result.milestone === 'M1'
                          ? 'Landowner award acceptance voucher anchored prior to fund release.'
                          : 'Final statutory payment receipt cleared via RENTAS interbank settlement.'}
                      </p>
                    </div>
                  )}

                  {result.caseId && (
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-500">Case ID</span>
                      <span className="font-mono text-slate-800 text-xs font-semibold">{result.caseId}</span>
                    </div>
                  )}

                  {result.onChainKey && (
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-500">On-Chain Key</span>
                      <span className="font-mono text-slate-800 text-xs">{result.onChainKey}</span>
                    </div>
                  )}

                  {result.localHash && (
                    <div className="pb-2 border-b border-slate-100 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">File SHA-256</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[11px] text-slate-700 truncate max-w-[170px]">{result.localHash}</span>
                          <CopyButton value={result.localHash} title="Copy file hash" size="sm" />
                        </div>
                      </div>
                      {result.onChainHash && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">On-Chain Hash</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[11px] text-green-700 truncate max-w-[170px]">{result.onChainHash}</span>
                            <span className="text-[10px] text-green-700 font-bold bg-green-50 px-1.5 py-0.5 rounded">
                              {result.localHash.toLowerCase() === result.onChainHash.toLowerCase() ? 'Direct Match' : 'Verified Anchor'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {result.transactionHash && (
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-500">Transaction</span>
                      <div className="flex items-center gap-1">
                        <a
                          href={result.etherscanUrl || `https://sepolia.etherscan.io/tx/${result.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {result.transactionHash.slice(0, 10)}…{result.transactionHash.slice(-6)}
                          <ExternalLink size={12} />
                        </a>
                        <CopyButton value={result.transactionHash} title="Copy tx hash" size="sm" />
                      </div>
                    </div>
                  )}

                  {result.contractAddress && (
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-500">Smart Contract</span>
                      <div className="flex items-center gap-1">
                        <a
                          href={result.contractUrl || `https://sepolia.etherscan.io/address/${result.contractAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {result.contractAddress.slice(0, 10)}…{result.contractAddress.slice(-6)}
                          <ExternalLink size={12} />
                        </a>
                        <CopyButton value={result.contractAddress} title="Copy contract address" size="sm" />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-slate-500">Network</span>
                    <span className="text-xs text-slate-700 font-medium">{result.network || 'Sepolia Testnet'}</span>
                  </div>

                  {result.timestamp && (
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-500">Timestamp</span>
                      <span className="font-mono text-slate-800 text-xs">{formatDateTime(result.timestamp * 1000)}</span>
                    </div>
                  )}

                  {result.voidReason && (
                    <div className="flex justify-between items-start pt-1">
                      <span className="text-red-500 font-medium">Void Reason</span>
                      <span className="text-red-600 text-right max-w-[180px]">{result.voidReason}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
