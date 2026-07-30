import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, Shield, FileText, Search, Fingerprint, Lock, RefreshCw, XCircle } from 'lucide-react';
import { blockchainApi } from '../../services/blockchainApi';

export default function VerifyAuditTrail() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

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
    <div className="min-h-screen bg-[var(--md-background)] p-4 sm:p-6 font-sans text-slate-900 flex items-center justify-center">
      <div className="max-w-4xl w-full">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-[var(--md-surface-container)] rounded-full mb-4 shadow-sm">
            <Shield className="w-8 h-8 text-[var(--md-primary)]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            Public Verification Portal
          </h1>
          <p className="text-slate-600 max-w-lg mx-auto">
            Verify the authenticity of digital settlement certificates using cryptographic hash cross-checking.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          
          {/* Upload Area */}
          <div className="relative group">
            <div 
              className={`relative h-full bg-[var(--md-surface-container)] border-2 border-dashed rounded-[2rem] p-8 sm:p-12 text-center transition-all duration-300 flex flex-col justify-center ${dragActive ? 'border-[var(--md-primary)] bg-[var(--md-secondary-container)]' : 'border-slate-300 hover:border-[var(--md-primary)]/50'}`}
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
                  <div className="w-20 h-20 bg-[var(--md-background)] rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                    <UploadCloud className="w-10 h-10 text-[var(--md-primary)]" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Upload Certificate</h3>
                  <p className="text-sm text-slate-600 mb-6">Drag & drop your PDF file here, or click to browse</p>
                  <span className="px-4 py-2 bg-[var(--md-background)] rounded-full text-xs text-slate-700 font-medium shadow-sm">
                    Supports .PDF format
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-[var(--md-background)] rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <FileText className="w-10 h-10 text-[var(--md-primary)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1 truncate w-full max-w-[200px]">{file.name}</h3>
                  <p className="text-xs text-slate-600 mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  
                  {!verifying && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); setError(''); }}
                      className="text-xs px-4 py-2 bg-[var(--md-background)] hover:bg-slate-50 rounded-full text-[var(--md-primary)] font-medium transition-colors shadow-sm"
                    >
                      Verify another file
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Verification Status */}
          <div className="bg-[var(--md-surface-container)] rounded-[2rem] p-6 sm:p-8 h-full min-h-[350px] flex flex-col justify-center shadow-sm">
            {!result && !verifying && !error && (
              <div className="text-center opacity-70">
                <Search className="w-12 h-12 text-[var(--md-primary)] mx-auto mb-4" />
                <p className="text-slate-600 text-sm max-w-[200px] mx-auto">Upload a PDF document to begin the live blockchain verification process.</p>
              </div>
            )}

            {verifying && (
              <div className="text-center space-y-4">
                <RefreshCw className="w-10 h-10 text-[var(--md-primary)] animate-spin mx-auto" />
                <p className="text-slate-800 font-medium">Hashing PDF & Querying Blockchain...</p>
              </div>
            )}

            {error && (
              <div className="text-center space-y-3">
                <XCircle className="w-12 h-12 text-red-500 mx-auto" />
                <p className="text-red-500 font-bold">{error}</p>
              </div>
            )}

            {result && (
              <div className="animate-in fade-in zoom-in duration-500 text-center space-y-4">
                <div className="w-16 h-16 bg-[var(--md-background)] rounded-full flex items-center justify-center mx-auto shadow-sm">
                  {result.verified ? (
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  ) : (
                    <XCircle className="w-10 h-10 text-red-500" />
                  )}
                </div>
                
                <h3 className={`text-2xl font-bold ${result.verified ? 'text-green-600' : 'text-red-500'}`}>
                  {result.verified ? 'Verified Document' : 'Verification Unsuccessful'}
                </h3>
                
                <p className={`text-sm font-medium ${result.verified ? 'text-green-600' : 'text-red-500'}`}>
                  {result.message}
                </p>
                
                <div className="bg-[var(--md-background)] rounded-2xl p-4 text-left shadow-sm space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status</span>
                    <span className="font-semibold text-slate-800">{result.status}</span>
                  </div>
                  {result.timestamp && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Published Timestamp</span>
                      <span className="font-mono text-slate-800">{new Date(result.timestamp * 1000).toLocaleString()}</span>
                    </div>
                  )}
                  {result.voidReason && (
                    <div className="flex justify-between">
                      <span className="text-red-500 font-medium">Void Reason</span>
                      <span className="text-red-600">{result.voidReason}</span>
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

