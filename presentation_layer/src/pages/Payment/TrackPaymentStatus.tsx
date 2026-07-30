import React, { useState, useEffect, useRef } from 'react';
import { Search, CheckCircle, Download, FileText, ArrowRight, ShieldAlert } from 'lucide-react';
import { paymentApi } from '../../services/paymentApi';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useSearchParams } from 'react-router-dom';

export default function TrackPaymentStatus() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [caseId, setCaseId] = useState(searchParams.get('caseId') || '');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [isDisputed, setIsDisputed] = useState(false);
  const [disputeFile, setDisputeFile] = useState<File | null>(null);
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

  const statuses = [
    'Approved',
    'Bank Details Submitted',
    'Transfer Initiated',
    'Authorised',
    'Paid',
  ];

  const statusIndex = statuses.indexOf(status);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!caseId.trim()) return;

    setLoading(true);
    setSearchParams({ caseId: caseId.trim() });
    
    try {
      const res = await paymentApi.getStatus(caseId);
      // Assuming getStatus returns paymentCase with status
      const fetchedStatus = res.paymentCase?.status || 'Approved';
      setStatus(isDisputed ? 'Payment Disputed' : fetchedStatus);
      notify({ type: 'success', title: 'Status retrieved successfully' });
    } catch (err: any) {
      notify({ type: 'error', title: 'Failed to retrieve status', message: err.message });
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

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
    setLoading(true);
    try {
      await paymentApi.dispute(caseId, disputeFile);
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
                {statuses.map((s, index) => {
                  const isCompleted = index <= statusIndex;
                  const isCurrent = index === statusIndex;
                  
                  return (
                    <div key={s} className={`flex items-start group ${isCompleted ? 'opacity-100' : 'opacity-50'}`}>
                      <div className={`z-10 flex items-center justify-center w-14 h-14 rounded-full transition-transform ease-md-bouncy duration-300 ${isCurrent ? 'scale-110 shadow-md bg-md-primary text-md-on-primary' : isCompleted ? 'bg-md-primary text-md-on-primary' : 'bg-md-surface-container-low text-md-on-surface-variant'}`}>
                        {isCompleted ? <CheckCircle size={24} /> : <div className="w-3 h-3 rounded-full bg-current opacity-50" />}
                      </div>
                      <div className="ml-6 flex-1 pt-3">
                        <h3 className={`text-xl font-bold transition-colors ${isCurrent ? 'text-md-primary' : 'text-md-on-surface'}`}>
                          {s}
                        </h3>
                        <p className="text-md-on-surface-variant mt-1">
                          {isCompleted ? 'Completed' : 'Pending'}
                        </p>
                        
                        {isCurrent && s === 'Paid' && (
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
          
          <div className="mt-12 p-6 bg-red-50 rounded-2xl border border-red-100">
             <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-red-900">Report Missing Funds / Dispute</h3>
             </div>
             <p className="text-sm text-red-700 mb-4">If you haven't received your funds, please upload your bank statement PDF to dispute the payment.</p>
             <div className="flex gap-4 items-center">
                <Input 
                  label="Bank Statement (PDF)"
                  type="file" 
                  accept=".pdf"
                  onChange={(e) => setDisputeFile(e.target.files?.[0] || null)}
                />
                <Button onClick={handleDispute} disabled={loading} variant="outlined" className="border-red-400 text-red-600 hover:bg-red-50">
                  Submit Dispute
                </Button>
             </div>
          </div>
        </Card>
      )}
    </div>
  );
}
