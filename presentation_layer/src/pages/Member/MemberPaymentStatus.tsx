import React, { useState, useEffect } from 'react';
import { CheckCircle2, Download, Clock, Activity, FileText, Banknote, ShieldAlert } from 'lucide-react';
import { paymentApi } from '../../services/paymentApi';

export default function MemberPaymentStatus() {
  const [caseId, setCaseId] = useState('CASE-001');
  const [paymentCase, setPaymentCase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [disputeMessage, setDisputeMessage] = useState('');
  const [disputeFile, setDisputeFile] = useState<File | null>(null);

  const fetchStatus = async (targetCaseId: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await paymentApi.getStatus(targetCaseId);
      setPaymentCase(res.paymentCase);
    } catch (err: any) {
      setError(err.message || 'Payment details not found for case ID: ' + targetCaseId);
      setPaymentCase(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus(caseId);
  }, []);

  const handleDownloadReceipt = async () => {
    try {
      const blob = await paymentApi.downloadReceipt(caseId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${caseId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(err.message || 'Receipt unavailable. Status must be Paid.');
    }
  };

  const handleDispute = async () => {
    if (!disputeFile) {
      alert('Please select a dispute document file (PDF or Image).');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await paymentApi.dispute(caseId, disputeFile);
      setDisputeMessage('Dispute submitted successfully.');
      await fetchStatus(caseId);
    } catch (err: any) {
      setError(err.message || 'Failed to submit dispute');
      setLoading(false);
    }
  };

  const currentStatus = paymentCase?.status || 'Initiated';
  const steps = [
    { title: 'Bank Details Submitted', description: paymentCase ? `Bank: ${paymentCase.bankName} (${paymentCase.accountNumber})` : 'Details submitted', icon: FileText, completed: !!paymentCase },
    { title: 'Transfer Initiated', description: paymentCase ? `Amount: RM ${(paymentCase.amount || 0).toLocaleString()}` : 'Transfer initiated', icon: Banknote, completed: currentStatus !== 'Bank Details Submitted' },
    { title: 'Authorised', description: `Signatures: ${paymentCase?.currentSignatures || 0} / ${paymentCase?.requiredSignatures || 1}`, icon: Activity, completed: currentStatus === 'Authorised' || currentStatus === 'Paid' },
    { title: 'Payment Completed', description: currentStatus === 'Paid' ? 'Funds transferred' : 'Pending final payout', icon: CheckCircle2, completed: currentStatus === 'Paid' },
  ];

  return (
    <div className="bg-[var(--md-background)] p-4 sm:p-6 font-sans text-slate-900 flex items-center justify-center min-h-[600px]">
      <div className="max-w-2xl w-full">
        <header className="mb-8 mt-4 sm:mt-8 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Payment Status
            </h1>
            <p className="text-slate-600 mt-2">Track the real-time progress of your compensation.</p>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="text"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              placeholder="Case ID"
              className="border border-slate-300 rounded-xl px-3 py-1.5 text-sm"
            />
            <button 
              onClick={() => fetchStatus(caseId)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-sm"
            >
              Lookup
            </button>
          </div>
        </header>

        {loading && <p className="text-gray-500 my-4">Loading payment status...</p>}
        {error && <p className="text-red-500 font-medium my-4">{error}</p>}
        {disputeMessage && <p className="text-green-600 font-medium my-4">{disputeMessage}</p>}

        <div className="bg-[var(--md-surface-container)] rounded-[2rem] p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-[var(--md-primary)]" />
                Live Tracker ({paymentCase?.caseId || caseId})
              </h2>
              <span className="px-3 py-1 bg-[var(--md-primary)]/10 text-[var(--md-primary)] rounded-full text-xs font-medium">
                {currentStatus}
              </span>
            </div>

            <div className="space-y-8 relative">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = step.completed;

                return (
                  <div key={index} className="flex items-start gap-4">
                    <div className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${isCompleted ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 p-4 rounded-2xl bg-[var(--md-background)] shadow-sm border border-slate-200">
                      <h3 className="font-semibold text-slate-800">{step.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <button 
            onClick={handleDownloadReceipt}
            className="flex-1 bg-[var(--md-surface-container)] hover:bg-[var(--md-secondary-container)] text-slate-900 py-4 px-6 rounded-3xl flex items-center justify-center gap-3 transition-all shadow-sm"
          >
            <Download className="w-5 h-5 text-[var(--md-primary)]" />
            <div className="text-left">
              <div className="font-semibold text-sm">Download Receipt</div>
              <div className="text-xs text-slate-600">PDF Document</div>
            </div>
          </button>
          
          <div className="flex-1 bg-[#FFD8E4] p-4 rounded-3xl flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#B3261E]" />
              <span className="font-semibold text-sm text-[#31111D]">Dispute / Report Missing Funds</span>
            </div>
            <input 
              type="file"
              onChange={(e) => setDisputeFile(e.target.files?.[0] || null)}
              className="text-xs block w-full text-slate-700"
            />
            <button 
              onClick={handleDispute}
              className="px-3 py-1.5 bg-[#B3261E] text-white rounded-xl text-xs font-semibold self-end"
            >
              Submit Dispute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

