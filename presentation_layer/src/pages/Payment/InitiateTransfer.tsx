import React, { useState, useMemo } from 'react';
import { 
  Send, Shield, ShieldAlert, FileText, 
  DollarSign, Users, Info, ChevronRight, Lock, 
  CheckCircle, ArrowRight, Wallet, UserCheck
} from 'lucide-react';
import { paymentApi } from '../../services/paymentApi';

export default function InitiateTransfer() {
  const [caseId, setCaseId] = useState('');
  const [adminId, setAdminId] = useState('admin-01');
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  
  const numericAmount = parseFloat(amount.replace(/,/g, '')) || 0;
  
  const sigLevel = useMemo(() => {
    if (numericAmount === 0) return { count: 1, label: 'Standard Authorization (1 Signature)', color: 'text-md-on-surface-variant', border: 'border-md-outline/20', bg: 'bg-md-surface-container-low', icon: Lock };
    const reqSigs = 1 + Math.floor(numericAmount / 1000000);
    if (reqSigs === 1) return { count: 1, label: 'Single Authorization Required (1 Signature)', color: 'text-md-on-success', border: 'border-md-success', bg: 'bg-md-success', icon: Shield };
    if (reqSigs === 2) return { count: 2, label: 'Dual Authorization Required (2 Signatures)', color: 'text-md-on-warning', border: 'border-md-warning', bg: 'bg-md-warning', icon: Users };
    return { count: reqSigs, label: `${reqSigs} Authorizations Required`, color: 'text-md-on-error', border: 'border-md-error', bg: 'bg-md-error', icon: ShieldAlert };
  }, [numericAmount]);

  const Icon = sigLevel.icon || Lock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId.trim()) {
      setError('Case Reference ID is required');
      return;
    }
    if (!adminId.trim()) {
      setError('Admin ID is required');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await paymentApi.initiate({
        caseId: caseId.trim(),
        adminId: adminId.trim()
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate transfer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-md-on-surface p-8 relative overflow-hidden font-sans">
      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        <div className="mb-10">
          <h1 className="text-3xl font-medium tracking-tight text-md-on-surface mb-2">Initiate Transfer</h1>
          <p className="text-md-on-surface-variant">Process payouts for approved compensation cases.</p>
        </div>

        {error && <p className="text-red-500 font-medium my-2">{error}</p>}
        {result && (
          <p className="text-green-600 font-medium my-2">
            Initiated. Requires {result.paymentCase?.requiredSignatures || result.requiredSignatures || 1} signature(s). Status: {result.paymentCase?.status}
          </p>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-md-surface-container border border-md-outline/10 rounded-3xl p-8 shadow-sm">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-md-on-surface-variant mb-2">Case Reference</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-md-on-surface-variant/70" />
                    <input 
                      type="text" 
                      placeholder="e.g. CASE-001" 
                      value={caseId}
                      onChange={(e) => setCaseId(e.target.value)}
                      className="bg-md-surface-container-low border border-md-outline/20 rounded-2xl pl-12 pr-4 py-3.5 text-md-on-surface placeholder:text-md-on-surface-variant/50 focus:outline-none focus:border-md-primary focus:ring-1 focus:ring-md-primary transition-all w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-md-on-surface-variant mb-2">Initiator Admin ID</label>
                  <div className="relative">
                    <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-md-on-surface-variant/70" />
                    <input 
                      type="text" 
                      placeholder="e.g. admin-01" 
                      value={adminId}
                      onChange={(e) => setAdminId(e.target.value)}
                      className="bg-md-surface-container-low border border-md-outline/20 rounded-2xl pl-12 pr-4 py-3.5 text-md-on-surface placeholder:text-md-on-surface-variant/50 focus:outline-none focus:border-md-primary focus:ring-1 focus:ring-md-primary transition-all w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-md-on-surface-variant mb-2">Transfer Amount Reference (MYR)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-md-primary" />
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-md-surface-container-low border border-md-outline/20 rounded-2xl pl-12 pr-4 py-4 text-2xl font-semibold text-md-on-surface placeholder:text-md-on-surface-variant/40 focus:outline-none focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 transition-all w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-10 flex justify-end">
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-4 bg-md-primary hover:opacity-90 active:scale-95 ease-md-bouncy shadow-sm rounded-full text-md-on-primary font-medium transition-all duration-300 disabled:opacity-50"
                >
                  <span>{loading ? 'Initiating...' : 'Initiate Transfer'}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Side Panel: Multi-sig Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className={`bg-md-surface-container border ${sigLevel.border} rounded-3xl p-6 transition-all duration-500 relative overflow-hidden shadow-sm`}>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2.5 rounded-2xl ${sigLevel.bg} ${sigLevel.color} border ${sigLevel.border}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-medium text-md-on-surface">Multi-Sig Formula</h3>
                </div>
                
                <p className={`text-sm font-medium ${sigLevel.color} mb-6 transition-colors duration-300`}>
                  {sigLevel.label}
                </p>

                <div className="space-y-3 text-xs text-md-on-surface-variant">
                  <p>Formula: <code>1 + floor(amount / 1,000,000)</code></p>
                  <p>Segregation of Duties: Initiator cannot authorize.</p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

