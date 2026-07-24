import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, Shield, FileText, Search, Fingerprint, Lock, RefreshCw, Check } from 'lucide-react';

export default function VerifyAuditTrail() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<'idle' | 'success' | 'failed'>('idle');
  const [verificationSteps, setVerificationSteps] = useState([false, false, false]);
  
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

  const simulateVerification = () => {
    setVerifying(true);
    setVerificationResult('idle');
    setVerificationSteps([false, false, false]);

    setTimeout(() => setVerificationSteps(prev => [true, prev[1], prev[2]]), 1000);
    setTimeout(() => setVerificationSteps(prev => [prev[0], true, prev[2]]), 2500);
    setTimeout(() => setVerificationSteps(prev => [prev[0], prev[1], true]), 4000);
    
    setTimeout(() => {
      setVerifying(false);
      setVerificationResult('success');
    }, 4500);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      simulateVerification();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      simulateVerification();
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBFE] p-4 sm:p-6 font-sans text-slate-900 flex items-center justify-center">
      <div className="max-w-4xl w-full">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-[#F3EDF7] rounded-full mb-4 shadow-sm">
            <Shield className="w-8 h-8 text-[#6750A4]" />
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
              className={`relative h-full bg-[#F3EDF7] border-2 border-dashed rounded-[2rem] p-8 sm:p-12 text-center transition-all duration-300 flex flex-col justify-center ${dragActive ? 'border-[#6750A4] bg-[#E8DEF8]' : 'border-slate-300 hover:border-[#6750A4]/50'}`}
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
                  <div className="w-20 h-20 bg-[#FFFBFE] rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                    <UploadCloud className="w-10 h-10 text-[#6750A4]" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Upload Certificate</h3>
                  <p className="text-sm text-slate-600 mb-6">Drag & drop your PDF file here, or click to browse</p>
                  <span className="px-4 py-2 bg-[#FFFBFE] rounded-full text-xs text-slate-700 font-medium shadow-sm">
                    Supports .PDF format
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-[#FFFBFE] rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <FileText className="w-10 h-10 text-[#6750A4]" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1 truncate w-full max-w-[200px]">{file.name}</h3>
                  <p className="text-xs text-slate-600 mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  
                  {!verifying && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setFile(null); setVerificationResult('idle'); }}
                      className="text-xs px-4 py-2 bg-[#FFFBFE] hover:bg-slate-50 rounded-full text-[#6750A4] font-medium transition-colors shadow-sm"
                    >
                      Verify another file
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Verification Status */}
          <div className="bg-[#F3EDF7] rounded-[2rem] p-6 sm:p-8 h-full min-h-[350px] flex flex-col justify-center shadow-sm">
            {verificationResult === 'idle' && !verifying && (
              <div className="text-center opacity-70">
                <Search className="w-12 h-12 text-[#6750A4] mx-auto mb-4" />
                <p className="text-slate-600 text-sm max-w-[200px] mx-auto">Upload a document to begin the secure verification process.</p>
              </div>
            )}

            {verifying && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-[#6750A4] animate-spin" />
                  Processing Document
                </h3>
                
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${verificationSteps[0] ? 'bg-[#6750A4] text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {verificationSteps[0] ? <Check className="w-4 h-4" /> : '1'}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${verificationSteps[0] ? 'text-slate-900' : 'text-slate-500'}`}>Extracting Document Hash</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${verificationSteps[1] ? 'bg-[#6750A4] text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {verificationSteps[1] ? <Check className="w-4 h-4" /> : '2'}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${verificationSteps[1] ? 'text-slate-900' : 'text-slate-500'}`}>Querying Blockchain Ledger</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${verificationSteps[2] ? 'bg-[#6750A4] text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {verificationSteps[2] ? <Check className="w-4 h-4" /> : '3'}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${verificationSteps[2] ? 'text-slate-900' : 'text-slate-500'}`}>Verifying Signatures</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {verificationResult === 'success' && (
              <div className="animate-in fade-in zoom-in duration-500 text-center">
                <div className="w-20 h-20 bg-[#FFFBFE] rounded-full flex items-center justify-center mx-auto mb-6 relative shadow-sm">
                  <CheckCircle className="w-10 h-10 text-[#6750A4] relative z-10" />
                </div>
                <h3 className="text-2xl font-bold text-[#6750A4] mb-2">Authentic Document</h3>
                <p className="text-slate-600 text-sm mb-6">
                  This certificate has been cryptographically verified against the official audit trail.
                </p>
                
                <div className="bg-[#FFFBFE] rounded-2xl p-4 text-left shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 flex items-center gap-2">
                      <Fingerprint className="w-3 h-3" /> Hash ID
                    </span>
                    <span className="text-xs font-mono text-slate-700">0x8f...4a2b</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 flex items-center gap-2">
                      <Lock className="w-3 h-3" /> Issued By
                    </span>
                    <span className="text-xs text-slate-700">Gov Trust Authority</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
