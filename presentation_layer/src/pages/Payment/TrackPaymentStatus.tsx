import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, CheckCircle, Download, FileText, ArrowRight, ShieldAlert, ShieldCheck, AlertTriangle, ExternalLink } from 'lucide-react';
import { paymentApi } from '../../services/paymentApi';
import { blockchainApi } from '../../services/blockchainApi';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useSearchParams } from 'react-router-dom';
import { normalizePaymentStatus } from './statusMaps';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function TrackPaymentStatus() {
  useDocumentTitle('Track Payment Status');
  const [searchParams, setSearchParams] = useSearchParams();
  const [caseId, setCaseId] = useState(searchParams.get('caseId') || '');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [isDisputed, setIsDisputed] = useState(false);
  const [disputeFile, setDisputeFile] = useState<File | null>(null);
  const [disputeRemark, setDisputeRemark] = useState('');
  const { notify } = useNotification();
  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.track-header',
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
    );
    gsap.fromTo('.track-search-card',
      { opacity: 0, y: 24, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.3)', delay: 0.2 }
    );
  }, { scope: pageRef });

  const [paymentCase, setPaymentCase] = useState<any>(null);

  // FR-019: dual-milestone on-chain verification badges (M1 award, M2 settlement).
  const [m1Record, setM1Record] = useState<any | null>(null);
  const [m2Record, setM2Record] = useState<any | null>(null);
  useEffect(() => {
    if (!caseId.trim()) return;
    let isStale = false;
    blockchainApi
      .getRecords()
      .then((res: any) => {
        if (isStale) return;
        const list: any[] = res?.records || [];
        const mine = list.filter((r) => r.caseId === caseId.trim());
        const isPublished = (s?: string | null) =>
          String(s || '').toUpperCase().replace(/[\s_]+/g, '_') === 'PUBLISHED';
        const m1 = mine.find((r) => (r.milestone ?? 'AWARD') === 'AWARD');
        const m2 = mine.find((r) => r.milestone === 'SETTLEMENT');
        setM1Record(m1 && isPublished(m1.status) ? m1 : null);
        setM2Record(m2 && isPublished(m2.status) ? m2 : null);
      })
      .catch(() => {
        if (!isStale) {
          setM1Record(null);
          setM2Record(null);
        }
      });
    return () => {
      isStale = true;
    };
  }, [caseId, status]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!caseId.trim()) return;

    setLoading(true);
    setSearchParams({ caseId: caseId.trim() });
    
    try {
      const res = await paymentApi.getStatus(caseId);
      const pc = res.paymentCase || null;
      setPaymentCase(pc);
      const fetchedStatus = normalizePaymentStatus(pc?.status || 'Offer Accepted');
      setStatus(isDisputed ? 'Payment Disputed' : fetchedStatus);
      notify({ type: 'success', title: 'Status retrieved successfully' });
    } catch (err: any) {
      notify({ type: 'error', title: 'Failed to retrieve status', message: err.message });
      setStatus('');
      setPaymentCase(null);
    } finally {
      setLoading(false);
    }
  };

  const isBankPending = !paymentCase?.bankName || !paymentCase?.accountNumber;
  const isBankVerified = !isBankPending;
  const isPaid = status === 'Paid';
  const isTransferSucceed = status === 'Transfer Succeed' || status === 'Payment Completed';

  const currentStep = useMemo(() => {
    if (isPaid) return 5;
    if (isTransferSucceed) return 4;
    if (['Transfer Initiated', 'Authorised', 'Pending Approval'].includes(status)) return 3;
    if (isBankVerified) return 2;
    return 1;
  }, [isPaid, isTransferSucceed, status, isBankVerified]);

  const steps = [
    {
      step: 1,
      title: 'Offer Accepted',
      subtitle: 'Statutory Form H award accepted by landowner',
      completed: true,
      badge: m1Record ? (
        <a
          href={`https://sepolia.etherscan.io/tx/${m1Record.transactionHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-0.5 mt-1 hover:bg-emerald-500/20 transition-colors"
        >
          <ShieldCheck size={12} className="shrink-0" />
          <span>Award Notarized (M1)</span>
          <ExternalLink size={10} className="shrink-0" />
        </a>
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-md-on-surface-variant bg-md-surface-container-low border border-md-outline/20 rounded-full px-2 py-0.5 mt-1">
          <AlertTriangle size={11} className="shrink-0" />
          <span>Award notarization pending</span>
        </span>
      ),
    },
    {
      step: 2,
      title: 'Bank Details Verified',
      subtitle: isBankVerified
        ? `${paymentCase?.bankName} (•••• ${paymentCase?.accountNumber?.slice(-4)}) recorded`
        : 'Awaiting beneficiary bank details submission',
      completed: isBankVerified,
    },
    {
      step: 3,
      title: 'Multi-Signature Governance',
      subtitle: paymentCase?.requiredSignatures
        ? `Cryptographic dual authorisation (${paymentCase.currentSignatures || 0}/${paymentCase.requiredSignatures} signatures)`
        : 'Dual administrative governance approval',
      completed: currentStep >= 4 || isTransferSucceed || isPaid,
    },
    {
      step: 4,
      title: 'Bank Clearing House',
      subtitle: 'Electronic Fund Transfer clearance by commercial bank network',
      completed: currentStep >= 5 || isPaid,
    },
    {
      step: 5,
      title: 'Disbursement Confirmed',
      subtitle: 'Statutory funds verified and confirmed received by landowner beneficiary',
      completed: isPaid,
      badge: (isPaid || isTransferSucceed) ? (
        m2Record ? (
          <a
            href={`https://sepolia.etherscan.io/tx/${m2Record.transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-0.5 mt-1 hover:bg-emerald-500/20 transition-colors"
          >
            <ShieldCheck size={12} className="shrink-0" />
            <span>Settlement Notarized (M2)</span>
            <ExternalLink size={10} className="shrink-0" />
          </a>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-md-on-surface-variant bg-md-surface-container-low border border-md-outline/20 rounded-full px-2 py-0.5 mt-1">
            <AlertTriangle size={11} className="shrink-0" />
            <span>Settlement notarization pending</span>
          </span>
        )
      ) : null,
    },
  ];

  useEffect(() => {
    if (caseId) {
      handleSearch();
    }
  }, []);

  const handleDownloadReceipt = async () => {
    try {
      notify({ type: 'general', title: 'Downloading receipt...' });
      const blob = await paymentApi.downloadReceipt(caseId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${caseId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      notify({ type: 'error', title: 'Failed to download receipt' });
    }
  };

  const handleDispute = async () => {
    if (!disputeFile) {
      notify({ type: 'error', title: 'Missing file', message: 'Please attach a bank statement PDF' });
      return;
    }
    if (!disputeRemark.trim()) {
      notify({ type: 'error', title: 'Missing remark', message: 'Please add a remark describing the discrepancy' });
      return;
    }
    setLoading(true);
    try {
      await paymentApi.dispute(caseId, disputeFile, disputeRemark.trim());
      setStatus('Payment Disputed');
      setIsDisputed(true);
      notify({ type: 'success', title: 'Dispute submitted successfully' });
    } catch (err: any) {
      notify({ type: 'error', title: 'Dispute failed', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl" ref={pageRef}>
      <div className="text-center mb-12 track-header">
        <h1 className="text-4xl font-bold text-md-on-surface mb-4">Track Payment Status</h1>
        <p className="text-md-on-surface-variant text-lg">Enter your Case ID to track the progress of your compensation payment.</p>
      </div>

      <Card className="p-8 mb-12 interactive hover:shadow-md transition-shadow ease-md-bouncy track-search-card">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1">
            <Input
              type="text"
              label="Case ID"
              placeholder="Enter Case ID (e.g., CAS-2026-001)"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              className="w-full"
            />
          </div>
          <Button type="submit" variant="animated-primary" disabled={loading} className="min-w-[120px]">
            {loading ? 'Searching...' : <><Search size={20} className="mr-2" /> Track</>}
          </Button>
        </form>
      </Card>

      {status && (
        <Card className="p-8 interactive">
          <h2 className="text-2xl font-bold text-md-on-surface mb-8">Payment Timeline</h2>
          {status === 'Payment Disputed' ? (
             <div className="p-4 bg-red-100 text-red-800 rounded-xl mb-6">
                <strong>Status:</strong> Payment Disputed. Our team is investigating the issue.
             </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[27px] top-4 bottom-4 w-1 bg-md-surface-container-low rounded-full" />
              
              <div className="space-y-8 relative">
                {steps.map((st) => {
                  const isCompleted = st.completed || st.step < currentStep;
                  const isCurrent = st.step === currentStep;

                  return (
                    <div key={st.step} className={`flex items-start group ${isCompleted || isCurrent ? 'opacity-100' : 'opacity-50'}`}>
                      <div className={`z-10 flex items-center justify-center w-14 h-14 rounded-full transition-transform ease-md-bouncy duration-300 ${isCurrent ? 'scale-110 shadow-md bg-md-primary text-md-on-primary' : isCompleted ? 'bg-md-primary text-md-on-primary' : 'bg-md-surface-container-low text-md-on-surface-variant'}`}>
                        {isCompleted ? <CheckCircle size={24} /> : <div className="w-3 h-3 rounded-full bg-current opacity-50" />}
                      </div>
                      <div className="ml-6 flex-1 pt-3">
                        <h3 className={`text-xl font-bold transition-colors ${isCurrent ? 'text-md-primary' : 'text-md-on-surface'}`}>
                          {st.title}
                        </h3>
                        <p className="text-md-on-surface-variant mt-1 text-sm">
                          {st.subtitle}
                        </p>
                        {st.badge}

                        {isCurrent && isPaid && (
                          <div className="mt-6">
                            <Button onClick={handleDownloadReceipt} variant="animated-primary" className="pl-4 pr-6">
                              <Download size={20} className="mr-2" /> Download Receipt
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {(isTransferSucceed || isPaid || isDisputed) ? (
            <div className="mt-12 p-6 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/30">
               <div className="flex items-center gap-2 mb-4">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-900 dark:text-red-300">Report Missing Funds / Dispute</h3>
               </div>
               <p className="text-sm text-red-700 dark:text-red-400 mb-4">If you haven't received your funds, attach your real bank statement or transaction record (PDF) and add a remark to dispute the payment.</p>
               <div className="flex flex-col gap-4">
                  <Input
                    label="Bank Statement / Transaction Record (PDF)"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => setDisputeFile(e.target.files?.[0] || null)}
                  />
                  <Input
                    label="Remark (required)"
                    value={disputeRemark}
                    onChange={(e) => setDisputeRemark(e.target.value)}
                    placeholder="Describe the discrepancy, delayed clearance, or amount difference..."
                  />
                  <div>
                    <Button
                      onClick={handleDispute}
                      disabled={loading || !disputeFile || !disputeRemark.trim()}
                      variant="outlined"
                      className="border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      Submit Dispute
                    </Button>
                  </div>
               </div>
            </div>
          ) : (
            <div className="mt-8 p-4 bg-md-surface-container-low rounded-xl border border-md-outline/10 text-xs text-md-on-surface-variant flex items-center gap-2">
              <ShieldAlert size={14} className="text-md-on-surface-variant shrink-0" />
              <span>Dispute lodging becomes available once bank clearance is initiated and funds release can be audited.</span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
