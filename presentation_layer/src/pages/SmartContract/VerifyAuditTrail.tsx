import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, Shield, FileText, Search, RefreshCw, XCircle, FileWarning } from 'lucide-react';
import { blockchainApi } from '../../services/blockchainApi';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Button } from '../../components/ui/Button';

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

      const res = await blockchainApi.verifyDocument(selectedFile);
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
                
                <div className="bg-[var(--md-background)] rounded-2xl p-5 text-left shadow-sm hover:shadow-md transition-shadow space-y-3 text-sm mt-4 border border-slate-100">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-slate-500">Status</span>
                    <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-1 rounded-md">{result.status || 'Unknown'}</span>
                  </div>
                  {result.timestamp && (
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-500">Timestamp</span>
                      <span className="font-mono text-slate-800 text-xs">{new Date(result.timestamp * 1000).toLocaleString()}</span>
                    </div>
                  )}
                  {result.voidReason && (
                    <div className="flex justify-between items-start pt-1">
                      <span className="text-red-500 font-medium">Void Reason</span>
                      <span className="text-red-600 text-right max-w-[150px]">{result.voidReason}</span>
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
