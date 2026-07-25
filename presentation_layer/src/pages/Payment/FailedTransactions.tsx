import React, { useState } from 'react';
import { 
  AlertOctagon, RotateCcw, XCircle, FileWarning, 
  Search, ChevronRight, Activity, HelpCircle,
  Banknote, ArrowRightLeft, FileX
} from 'lucide-react';

const failedLogs = [
  { id: 'ERR-77382', trxId: 'TRX-98110', error: 'ACCOUNT_CLOSED', desc: 'Destination account is marked as closed by the receiving institution.', date: '2026-07-24 10:15', amount: '$4,500.00' },
  { id: 'ERR-77383', trxId: 'TRX-98112', error: 'LIMIT_EXCEEDED', desc: 'Beneficiary account cannot receive transfers above their daily limit.', date: '2026-07-24 11:22', amount: '$25,000.00' },
  { id: 'ERR-77385', trxId: 'TRX-98144', error: 'INVALID_ROUTING', desc: 'Routing number format is invalid for the specified country code.', date: '2026-07-24 13:05', amount: '$1,250.00' },
];

export default function FailedTransactions() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="text-md-on-surface p-8 relative overflow-hidden font-sans">
      {/* Background Error State Vibe (Subtle Red/Orange) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-md-error/40 blur-[150px] pointer-events-none" />
      
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-md-error rounded-2xl">
              <AlertOctagon className="w-6 h-6 text-md-on-error" />
            </div>
            <div>
              <h1 className="text-3xl font-medium tracking-tight text-md-on-surface mb-1">Resolution Center</h1>
              <p className="text-md-on-surface-variant text-sm">Investigate and resolve failed transactions and bank rejections.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-md-surface-container-low p-1.5 rounded-full border border-md-outline/10 shadow-sm">
             <button className="px-5 py-2.5 bg-md-surface-container text-md-on-surface rounded-full text-sm font-medium shadow-sm ease-md-bouncy active:scale-95 transition-all">Needs Action (3)</button>
             <button className="px-5 py-2.5 text-md-on-surface-variant hover:text-md-on-surface rounded-full text-sm font-medium transition-colors">Resolved</button>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-md-surface-container rounded-[24px] shadow-sm hover:shadow-md border border-md-outline/5 p-6 flex flex-col relative overflow-hidden group cursor-pointer transition-all duration-300 ease-md-bouncy active:scale-95">
            <div className="absolute inset-0 bg-gradient-to-br from-md-error/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-3 bg-md-error rounded-2xl text-md-on-error">
                <FileX className="w-5 h-5" />
              </div>
              <span className="text-2xl font-semibold text-md-on-surface">12</span>
            </div>
            <h3 className="text-md-on-surface font-medium mb-1 relative z-10">Invalid Details</h3>
            <p className="text-sm text-md-on-surface-variant relative z-10">Account numbers, routing errors</p>
          </div>
          
          <div className="bg-md-surface-container rounded-[24px] shadow-sm hover:shadow-md border border-md-outline/5 p-6 flex flex-col relative overflow-hidden group cursor-pointer transition-all duration-300 ease-md-bouncy active:scale-95">
            <div className="absolute inset-0 bg-gradient-to-br from-md-warning/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-3 bg-md-warning rounded-2xl text-md-on-warning">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <span className="text-2xl font-semibold text-md-on-surface">4</span>
            </div>
            <h3 className="text-md-on-surface font-medium mb-1 relative z-10">Bank Rejections</h3>
            <p className="text-sm text-md-on-surface-variant relative z-10">Limits exceeded, account blocked</p>
          </div>

          <div className="bg-md-surface-container rounded-[24px] shadow-sm hover:shadow-md border border-md-outline/5 p-6 flex flex-col relative overflow-hidden group cursor-pointer transition-all duration-300 ease-md-bouncy active:scale-95">
            <div className="absolute inset-0 bg-gradient-to-br from-md-secondary-container/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-3 bg-md-secondary-container rounded-2xl text-md-on-secondary-container">
                <Banknote className="w-5 h-5" />
              </div>
              <span className="text-2xl font-semibold text-md-on-surface">1</span>
            </div>
            <h3 className="text-md-on-surface font-medium mb-1 relative z-10">Insufficient Funds</h3>
            <p className="text-sm text-md-on-surface-variant relative z-10">Settlement account low balance</p>
          </div>
        </div>

        {/* Failed Logs Table */}
        <div className="bg-md-surface-container rounded-[32px] shadow-sm border border-md-outline/5 overflow-hidden">
          <div className="p-6 border-b border-md-outline/10 flex flex-col sm:flex-row gap-4 justify-between items-center bg-md-surface-container-low/30">
            <h2 className="text-lg font-medium text-md-on-surface flex items-center gap-3">
              <div className="p-1.5 bg-md-error rounded-xl">
                <FileWarning className="w-5 h-5 text-md-on-error" />
              </div>
              Error Logs
            </h2>
            <div className="relative sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-md-on-surface-variant" />
              <input 
                type="text" 
                placeholder="Search error code or TRX..." 
                className="bg-md-surface-container-low border border-md-outline/20 rounded-full pl-11 pr-4 py-2.5 text-sm text-md-on-surface placeholder:text-md-on-surface-variant/70 focus:outline-none focus:border-md-primary focus:ring-1 focus:ring-md-primary transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="divide-y divide-md-outline/10">
            {failedLogs.map((log) => (
              <div key={log.id} className="p-6 hover:bg-md-surface-container-low/50 transition-colors group flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-md-error text-md-on-error rounded-lg text-xs font-mono font-medium">
                      {log.error}
                    </span>
                    <span className="text-sm text-md-on-surface-variant flex items-center gap-2">
                      Ref: <span className="text-md-on-surface font-mono">{log.trxId}</span>
                    </span>
                    <span className="text-xs text-md-on-surface-variant flex items-center gap-1 ml-auto lg:ml-0 font-medium bg-md-surface-container-low px-2 py-1 rounded-md">
                      {log.date}
                    </span>
                  </div>
                  <p className="text-sm text-md-on-surface leading-relaxed">
                    {log.desc}
                  </p>
                </div>
                
                <div className="flex items-center gap-6 lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 border-md-outline/10 pt-5 lg:pt-0 mt-5 lg:mt-0">
                  <div className="text-right">
                    <div className="text-sm text-md-on-surface-variant mb-1 font-medium">Amount</div>
                    <div className="font-semibold text-md-on-surface text-lg tracking-tight">{log.amount}</div>
                  </div>
                  <div className="flex gap-3">
                    <button className="p-3 bg-md-surface-container-low border border-md-outline/20 hover:bg-md-surface-container rounded-full text-md-on-surface-variant hover:text-md-on-surface transition-all shadow-sm ease-md-bouncy active:scale-95" title="View Details">
                       <Search className="w-5 h-5" />
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-md-primary hover:opacity-90 shadow-sm rounded-full text-sm font-medium text-md-on-primary transition-all ease-md-bouncy active:scale-95">
                      <RotateCcw className="w-4 h-4" />
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
