import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  UploadCloud, 
  CheckCircle, 
  Shield, 
  FileText, 
  Search, 
  RefreshCw, 
  XCircle,
  ArrowLeft,
  CheckCircle2,
  Lock,
  ExternalLink,
  ShieldCheck,
  Check,
  AlertTriangle,
  Clock,
  FileQuestion
} from 'lucide-react';
import { blockchainApi } from '../../services/blockchainApi';
import { useRole } from '../../hooks/useRole';
import { landAcquisitionApi } from '../../services/landAcquisitionApi';
import { Button } from '../../components/ui/Button';
import { CopyButton } from '../../components/ui/CopyButton';
import { formatDateTime } from '../../utils/dateFormat';

export default function VerifyAuditTrail() {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useRole();
  const [memberCases, setMemberCases] = useState<any[]>([]);

  React.useEffect(() => {
    if (!user) return;
    let isMounted = true;
    landAcquisitionApi.getAllCases({
      limit: 100,
      userRole: user.role,
      userId: user.userId,
      ownerNric: user.identificationNumber,
    }).then((res: any) => {
      if (!isMounted) return;
      const all: any[] = res?.cases || [];
      const cleanIc = (user.identificationNumber || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const userNameClean = (user.name || '').toLowerCase();
      const userEmailClean = (user.email || '').toLowerCase();

      const userCases = all.filter((c: any) => {
        if (c.createdById === user.userId) return true;
        const owners = c.landParcel?.ownerships?.map((o: any) => o.landOwner).filter(Boolean) || [];
        return owners.some((ow: any) => {
          const owIc = (ow.nric || ow.icNumber || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          return (
            (cleanIc && owIc === cleanIc) ||
            ow.ownerId === user.userId ||
            (ow.email && ow.email.toLowerCase() === userEmailClean) ||
            (ow.name && ow.name.toLowerCase() === userNameClean)
          );
        });
      });
      setMemberCases(userCases);
    }).catch(() => {
      // Non-blocking fallback
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const isMyCase = Boolean(
    result?.caseId && memberCases.some((c) => c.caseId === result.caseId)
  );

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
      setError(err.message || 'Verification failed. Document not found on the smart contract registry.');
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
    <div className="max-w-4xl mx-auto pt-6 sm:pt-8 pb-12 space-y-6 text-md-on-surface px-4 sm:px-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-md-outline/15">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-md-primary/10 text-md-primary">
              Cryptographic Notarisation
            </span>
            <span className="text-xs text-md-on-surface-variant">Immutable Audit Trail</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-md-on-surface">
            Blockchain Document Verification
          </h1>
          <p className="text-xs sm:text-sm text-md-on-surface-variant mt-1">
            Verify the statutory award (Form H) or the payment receipt against its on-chain SHA-256 anchor — both milestones of a case are independently notarized.
          </p>
        </div>

        <Link
          to="/member"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-md-primary hover:underline self-start sm:self-center shrink-0"
        >
          <ArrowLeft size={16} />
          <span>Return to Dashboard</span>
        </Link>
      </div>

      {/* Info Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-md-surface-container border border-md-outline/15 flex items-start gap-3.5 shadow-xs">
        <Shield size={22} className="text-md-primary shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-md-on-surface-variant leading-relaxed">
          <span className="font-bold text-md-on-surface">Zero-Knowledge Integrity Check: </span>
          Every official compensation voucher and settlement certificate generated by FCR-SCS is cryptographically hashed and published to the Ethereum blockchain ledger. Drag & drop your PDF file below to verify its on-chain validity.
        </div>
      </div>

      {/* Row 1: Upload Dropzone */}
      <div className="relative group w-full">
        <div 
          className={`relative w-full bg-md-surface-container border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all duration-200 ease-md-bouncy flex flex-col items-center justify-center min-h-[220px] ${
            dragActive 
              ? 'border-md-primary bg-md-secondary-container/50' 
              : 'border-md-outline/30 hover:border-md-primary/60'
          }`}
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
            <div 
              className="flex flex-col items-center cursor-pointer w-full" 
              onClick={() => inputRef.current?.click()}
            >
              <div className="w-16 h-16 bg-md-surface-container-low rounded-full flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200 shadow-sm text-md-primary">
                <UploadCloud size={34} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-md-on-surface mb-1">
                Upload Statutory or Settlement PDF
              </h3>
              <p className="text-xs sm:text-sm text-md-on-surface-variant mb-3 max-w-md">
                Drag &amp; drop your official certificate PDF here, or click to browse files
              </p>
              <span className="px-3.5 py-1 bg-md-surface-container-low rounded-full text-xs text-md-on-surface-variant font-semibold border border-md-outline/15">
                Official Form H Award &amp; Settlement Voucher (.PDF)
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-md-surface-container-low rounded-full flex items-center justify-center mb-4 text-md-primary shadow-sm">
                <FileText size={34} />
              </div>
              <h3 className="text-base font-bold text-md-on-surface mb-1 truncate w-full max-w-md">
                {file.name}
              </h3>
              <p className="text-xs text-md-on-surface-variant mb-4">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              
              {!verifying && (
                <Button 
                  variant="tonal"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setFile(null); 
                    setResult(null); 
                    setError(''); 
                  }}
                >
                  <span>Verify Another File</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Verification Details Result Panel */}
      <div className="bg-md-surface-container border border-md-outline/15 rounded-2xl p-6 sm:p-8 shadow-sm">
        {!result && !verifying && !error && (
          <div className="text-center py-10 opacity-75">
            <Search size={44} className="text-md-primary mx-auto mb-3 opacity-60" />
            <h4 className="text-base font-bold text-md-on-surface mb-1">
              Awaiting Document Submission
            </h4>
            <p className="text-xs sm:text-sm text-md-on-surface-variant max-w-sm mx-auto">
              Select or drop a statutory award or settlement receipt PDF above to begin instant cryptographic verification against the Ethereum ledger.
            </p>
          </div>
        )}

        {verifying && (
          <div className="text-center py-12 space-y-4">
            <RefreshCw size={44} className="text-md-primary animate-spin mx-auto" />
            <p className="text-sm sm:text-base font-bold text-md-on-surface">
              Computing SHA-256 Hash &amp; Querying Ethereum Blockchain...
            </p>
            <p className="text-xs text-md-on-surface-variant">
              Verifying cryptographic authenticity with smart contract registry.
            </p>
          </div>
        )}

        {error && (
          <div className="text-center py-8 space-y-3">
            <XCircle size={44} className="text-red-500 mx-auto" />
            <h4 className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400">
              Verification Unsuccessful
            </h4>
            <p className="text-xs sm:text-sm text-md-on-surface-variant max-w-md mx-auto">
              {error}
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="text-center pb-2">
              <div className="w-16 h-16 bg-md-surface-container-low rounded-full flex items-center justify-center mx-auto mb-3.5 shadow-sm">
                {result.verified ? (
                  <CheckCircle2 size={38} className="text-emerald-600 dark:text-emerald-400" />
                ) : result.status === 'Voided' ? (
                  <XCircle size={38} className="text-amber-500" />
                ) : result.status === 'Not Found' ? (
                  <Clock size={38} className="text-md-primary" />
                ) : (
                  <XCircle size={38} className="text-red-500" />
                )}
              </div>
              
              <h3 className={`text-xl sm:text-2xl font-bold ${
                result.verified
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : result.status === 'Voided'
                  ? 'text-amber-600'
                  : result.status === 'Not Found'
                  ? 'text-md-on-surface'
                  : 'text-red-600'
              }`}>
                {result.verified
                  ? 'Cryptographically Verified on Ethereum'
                  : result.status === 'Voided'
                  ? 'Document Voided on Blockchain'
                  : result.status === 'Not Found'
                  ? 'Document Not Published on Blockchain'
                  : 'Certificate Altered / Unverified'}
              </h3>
              <p className="text-xs sm:text-sm text-md-on-surface-variant mt-1.5 font-medium">
                {result.message}
              </p>
            </div>

            {/* Guidance Advisory Card for Unverified / Altered / Voided / Not Found Documents */}
            {!result.verified && (
              <div className={`p-5 rounded-2xl bg-md-surface-container-low border ${
                result.status === 'Altered'
                  ? 'border-red-500/30'
                  : result.status === 'Voided'
                  ? 'border-amber-500/30'
                  : 'border-md-outline/25'
              } text-xs sm:text-sm space-y-3.5 shadow-sm`}>
                <div className="flex items-start gap-3">
                  {result.status === 'Altered' ? (
                    <AlertTriangle size={24} className="shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                  ) : result.status === 'Voided' ? (
                    <AlertTriangle size={24} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  ) : (
                    <Clock size={24} className="shrink-0 text-md-primary mt-0.5" />
                  )}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className={`font-bold text-xs uppercase tracking-wider ${
                      result.status === 'Altered'
                        ? 'text-red-700 dark:text-red-300'
                        : result.status === 'Voided'
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-md-primary'
                    }`}>
                      {result.status === 'Altered'
                        ? 'Cryptographic Mismatch Detected (Document Altered)'
                        : result.status === 'Voided'
                        ? 'Statutory Revocation Notice (Document Voided)'
                        : 'Record Not Found (Awaiting Milestone Notarization)'}
                    </div>
                    <p className="text-xs leading-relaxed text-md-on-surface-variant font-medium">
                      {result.status === 'Altered' ? (
                        <>
                          The cryptographic SHA-256 fingerprint of your uploaded PDF does not match the official record{' '}
                          {result.isPublished ? (
                            <strong className="text-md-on-surface font-semibold">(published on Ethereum Sepolia)</strong>
                          ) : (
                            <strong className="text-md-on-surface font-semibold">(stored in the statutory registry awaiting on-chain publication after the 24-hour grace period)</strong>
                          )}.
                          Any alteration—including re-saving, PDF editing, text modification, or scanner compression—breaks cryptographic verification.
                          Please ensure you uploaded the genuine, unmodified official Form H or payment receipt.
                        </>
                      ) : result.status === 'Voided' ? (
                        <>
                          This record was legally revoked on the Ethereum blockchain. Reason: <strong className="text-amber-800 dark:text-amber-300 font-semibold">{result.voidReason || 'Statutory revocation order'}</strong>. Please consult the Land Acquisition Authority for details.
                        </>
                      ) : (
                        <>
                          This document has not been anchored on Ethereum yet. If this offer was accepted recently, remember that official compensation awards undergo a statutory <strong>24-hour cooling grace period</strong> before the Government Administrator publishes Milestone 1 on-chain.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-md-outline/10">
                  <Link to="/contact">
                    <Button variant="filled" size="sm" className="text-xs inline-flex items-center gap-1.5">
                      <span>Contact Authority Support</span>
                      <ExternalLink size={12} />
                    </Button>
                  </Link>
                  <Link to="/member">
                    <Button variant="outlined" size="sm" className="text-xs">
                      Return to Member Dashboard
                    </Button>
                  </Link>
                  <Link to="/member/offer-letter">
                    <Button variant="tonal" size="sm" className="text-xs">
                      View Official Offer Letters
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Contextual Ownership Banner */}
            {result.verified && result.caseId && (
              isMyCase ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200">
                  <div className="flex items-start sm:items-center gap-3">
                    <ShieldCheck size={24} className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-0" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                        Personal Case Document Confirmed
                      </div>
                      <p className="text-xs text-emerald-950/80 dark:text-emerald-200/80">
                        This verified on-chain document is officially registered under your citizen profile ({result.caseId}).
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/member?caseId=${result.caseId}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 transition-colors shadow-xs self-start sm:self-auto"
                  >
                    <span>View Case in Dashboard</span>
                    <ExternalLink size={13} />
                  </Link>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
                  <AlertTriangle size={24} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs uppercase tracking-wider text-amber-950 dark:text-amber-300">
                      Authentic On-Chain Record (External Case)
                    </div>
                    <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                      This document cryptographically matches the immutable Ethereum ledger, but belongs to case <strong className="font-mono font-bold text-amber-950 dark:text-amber-200">{result.caseId}</strong>. It is not registered under your citizen profile.
                    </p>
                  </div>
                </div>
              )
            )}
            
            {/* Full Details Container */}
            <div className="bg-md-surface-container-low rounded-2xl p-5 sm:p-7 text-left border border-md-outline/15 space-y-3.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center pb-3 border-b border-md-outline/10">
                <span className="text-md-on-surface-variant font-semibold">Verification Status</span>
                <span className={`font-bold px-3 py-1 rounded-full text-xs ${
                  result.verified
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                    : result.status === 'Voided'
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                    : result.status === 'Not Found'
                    ? 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/30'
                    : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30'
                }`}>
                  {result.status || (result.verified ? 'AUTHENTIC' : 'INVALID')}
                </span>
              </div>

              {result.caseId && (
                <div className="flex justify-between items-center pb-3 border-b border-md-outline/10">
                  <span className="text-md-on-surface-variant font-semibold">Account Ownership</span>
                  <span className={`font-bold px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1.5 ${
                    isMyCase
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isMyCase ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {isMyCase ? 'Your Citizen Account' : 'External Landowner Record'}
                  </span>
                </div>
              )}

              {result.milestone && (
                <div className="pb-3 border-b border-md-outline/10">
                  <div className="flex justify-between items-center">
                    <span className="text-md-on-surface-variant font-semibold">Milestone</span>
                    <span className="font-bold text-md-on-surface text-xs sm:text-sm">
                      {result.milestone === 'M1' ? 'Milestone 1 (M1) — Statutory Form H Award' : 'Milestone 2 (M2) — Payment Settlement'}
                    </span>
                  </div>
                  <p className="text-xs text-md-on-surface-variant mt-1">
                    {result.milestone === 'M1'
                      ? 'Government Form H compensation offer accepted by landowner, anchored prior to disbursement.'
                      : 'Official payment receipt & clearance record after RENTAS interbank settlement.'}
                  </p>
                </div>
              )}

              {result.caseId && (
                <div className="flex justify-between items-center pb-3 border-b border-md-outline/10">
                  <span className="text-md-on-surface-variant font-semibold">Case ID</span>
                  <span className="font-mono font-bold text-md-on-surface text-xs sm:text-sm">{result.caseId}</span>
                </div>
              )}

              {result.onChainKey && (
                <div className="flex justify-between items-center pb-3 border-b border-md-outline/10">
                  <span className="text-md-on-surface-variant font-semibold">On-Chain Ledger Key</span>
                  <span className="font-mono font-bold text-md-on-surface text-xs sm:text-sm">{result.onChainKey}</span>
                </div>
              )}

              {/* SHA-256 Hash Comparison */}
              {result.localHash && (
                <div className="pt-1 pb-2 border-b border-md-outline/10 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <span className="text-md-on-surface-variant font-semibold">Uploaded File SHA-256</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-md-on-surface truncate max-w-[220px] sm:max-w-md">
                        {result.localHash}
                      </span>
                      <CopyButton value={result.localHash} title="Copy file hash" size="sm" />
                    </div>
                  </div>
                  {result.onChainHash && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <span className="text-md-on-surface-variant font-semibold">
                        {result.expectedSource ? `Expected Hash (${result.expectedSource})` : 'Registered Anchor Hash'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-xs truncate max-w-[220px] sm:max-w-md font-semibold ${
                          result.localHash.toLowerCase() === result.onChainHash.toLowerCase()
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {result.onChainHash}
                        </span>
                        {result.localHash.toLowerCase() === result.onChainHash.toLowerCase() ? (
                          <span className="inline-flex items-center text-xs text-emerald-700 dark:text-emerald-400 font-bold ml-1">
                            <Check size={12} className="mr-0.5" /> Direct Match
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs text-red-600 dark:text-red-400 font-bold ml-1">
                            <XCircle size={12} className="mr-0.5" /> Hash Mismatch
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Transaction Hash with Etherscan Link */}
              {result.transactionHash && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-3 border-b border-md-outline/10">
                  <span className="text-md-on-surface-variant font-semibold">Transaction Hash</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={result.etherscanUrl || `https://sepolia.etherscan.io/tx/${result.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs sm:text-sm text-md-primary hover:underline inline-flex items-center gap-1 font-semibold"
                      title="View transaction on Sepolia Etherscan"
                    >
                      <span className="truncate max-w-[200px] sm:max-w-none">{result.transactionHash}</span>
                      <ExternalLink size={13} className="shrink-0" />
                    </a>
                    <CopyButton value={result.transactionHash} title="Copy transaction hash" size="sm" />
                  </div>
                </div>
              )}

              {/* Contract Address with Etherscan Link */}
              {result.contractAddress && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-3 border-b border-md-outline/10">
                  <span className="text-md-on-surface-variant font-semibold">Smart Contract</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={result.contractUrl || `https://sepolia.etherscan.io/address/${result.contractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs sm:text-sm text-md-primary hover:underline inline-flex items-center gap-1 font-semibold"
                      title="View contract registry on Sepolia Etherscan"
                    >
                      <span className="truncate max-w-[200px] sm:max-w-none">{result.contractAddress}</span>
                      <ExternalLink size={13} className="shrink-0" />
                    </a>
                    <CopyButton value={result.contractAddress} title="Copy contract address" size="sm" />
                  </div>
                </div>
              )}

              {/* Network & Timestamp */}
              <div className="flex justify-between items-center">
                <span className="text-md-on-surface-variant font-semibold">Network</span>
                <span className="text-xs sm:text-sm text-md-on-surface font-medium">
                  {result.network || 'Sepolia Testnet (Chain ID 11155111)'}
                </span>
              </div>

              {result.timestamp && (
                <div className="flex justify-between items-center">
                  <span className="text-md-on-surface-variant font-semibold">On-Chain Timestamp</span>
                  <span className="font-mono text-md-on-surface text-xs sm:text-sm font-medium">
                    {formatDateTime(result.timestamp * 1000)}
                  </span>
                </div>
              )}

              {result.voidReason && (
                <div className="pt-3 border-t border-red-500/20 text-red-600">
                  <div className="flex justify-between items-start">
                    <span className="font-bold">Void Reason</span>
                    <span className="text-right max-w-sm font-medium">{result.voidReason}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
