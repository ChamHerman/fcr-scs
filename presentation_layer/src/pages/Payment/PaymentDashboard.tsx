import React, { useState } from 'react';
import { 
  Search, Filter, Clock, CheckCircle, XCircle, 
  AlertCircle, MoreHorizontal, Activity, DollarSign, 
  ArrowUpRight, BarChart, ChevronDown 
} from 'lucide-react';

const stats = [
  { label: 'Total Volume', value: '$2.4M', change: '+12.5%', icon: DollarSign, color: 'text-md-on-success', bg: 'bg-md-success' },
  { label: 'Pending Processing', value: '$845K', change: '+5.2%', icon: Clock, color: 'text-md-on-warning', bg: 'bg-md-warning' },
  { label: 'Completed (24h)', value: '1,245', change: '+18.1%', icon: CheckCircle, color: 'text-md-on-secondary-container', bg: 'bg-md-secondary-container' },
  { label: 'Failed Transfers', value: '12', change: '-2.4%', icon: XCircle, color: 'text-md-on-error', bg: 'bg-md-error' },
];

const transactions = [
  { id: 'TRX-98231', beneficiary: 'Emma Thompson', amount: '$12,500.00', status: 'Completed', date: '2026-07-24 14:30', method: 'Bank Transfer' },
  { id: 'TRX-98232', beneficiary: 'Marcus Chen', amount: '$4,200.00', status: 'Processing', date: '2026-07-24 14:15', method: 'Wire' },
  { id: 'TRX-98233', beneficiary: 'Sarah Jenkins', amount: '$28,900.00', status: 'Pending', date: '2026-07-24 13:45', method: 'Bank Transfer' },
  { id: 'TRX-98234', beneficiary: 'David Rodriguez', amount: '$1,150.00', status: 'Failed', date: '2026-07-24 13:10', method: 'RTP' },
  { id: 'TRX-98235', beneficiary: 'Elena Rostova', amount: '$9,800.00', status: 'Completed', date: '2026-07-24 12:20', method: 'Bank Transfer' },
];

export default function PaymentDashboard() {
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Completed': return 'bg-md-success text-md-on-success border-transparent';
      case 'Processing': 
      case 'Pending': return 'bg-md-warning text-md-on-warning border-transparent';
      case 'Failed': return 'bg-md-error text-md-on-error border-transparent';
      default: return 'bg-md-surface-container-low text-md-on-surface-variant border-transparent';
    }
  };

  return (
    <div className="w-full min-h-screen bg-md-background text-md-on-surface p-8 relative overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-md-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-md-secondary-container/30 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-md-on-surface mb-1">Payment Dashboard</h1>
            <p className="text-md-on-surface-variant text-sm">Monitor and manage all outgoing compensations and transfers.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-md-surface-container hover:bg-md-surface-container-low border border-md-outline/20 rounded-full text-sm font-medium text-md-on-surface transition-all duration-300 ease-md-bouncy active:scale-95 shadow-sm">
              <Clock className="w-4 h-4" />
              <span>Last 30 Days</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-md-primary hover:opacity-90 shadow-sm rounded-full text-sm font-medium text-md-on-primary transition-all duration-300 ease-md-bouncy active:scale-95">
              <ArrowUpRight className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-md-surface-container rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300 ease-md-bouncy shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className="flex items-center gap-1 text-md-on-success bg-md-success px-2.5 py-1 rounded-full text-xs font-medium">
                  <ArrowUpRight className="w-3 h-3" />
                  {stat.change}
                </div>
              </div>
              <div>
                <h3 className="text-md-on-surface-variant text-sm font-medium mb-1">{stat.label}</h3>
                <p className="text-2xl font-semibold text-md-on-surface tracking-tight">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Table Section */}
        <div className="bg-md-surface-container rounded-[24px] shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-md-outline/10 flex flex-col sm:flex-row gap-4 justify-between items-center bg-md-surface-container-low/50">
            <h2 className="text-lg font-medium text-md-on-surface flex items-center gap-2">
              <Activity className="w-5 h-5 text-md-primary" />
              Recent Transactions
            </h2>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative group w-full sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-md-on-surface-variant group-focus-within:text-md-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search TRX ID or name..." 
                  className="w-full bg-md-surface-container-low border border-md-outline/20 rounded-full pl-11 pr-4 py-2.5 text-sm text-md-on-surface placeholder:text-md-on-surface-variant focus:outline-none focus:border-md-primary focus:ring-1 focus:ring-md-primary transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="p-3 bg-md-surface-container-low border border-md-outline/20 rounded-full hover:bg-md-surface-container-low/80 text-md-on-surface-variant hover:text-md-on-surface transition-all ease-md-bouncy active:scale-95 shadow-sm">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-md-surface-container-low/30 text-md-on-surface-variant text-xs uppercase tracking-wider">
                  <th className="p-4 font-medium pl-6">Transaction ID</th>
                  <th className="p-4 font-medium">Beneficiary</th>
                  <th className="p-4 font-medium">Date &amp; Time</th>
                  <th className="p-4 font-medium">Method</th>
                  <th className="p-4 font-medium">Amount</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-md-outline/5">
                {transactions.map((trx, idx) => (
                  <tr key={idx} className="hover:bg-md-surface-container-low/50 transition-colors group">
                    <td className="p-4 pl-6">
                      <span className="text-sm font-medium text-md-primary font-mono">{trx.id}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-medium text-md-on-surface">{trx.beneficiary}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-md-on-surface-variant">{trx.date}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-md-on-surface-variant">{trx.method}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-semibold text-md-on-surface">{trx.amount}</span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(trx.status)}`}>
                        {trx.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button className="p-2 text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-surface-container-low rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 ease-md-bouncy active:scale-95">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="p-5 border-t border-md-outline/10 flex items-center justify-between text-sm text-md-on-surface-variant bg-md-surface-container-low/30">
            <span>Showing 1 to 5 of 124 entries</span>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 bg-md-surface-container border border-md-outline/20 rounded-full hover:bg-md-surface-container-low transition-colors disabled:opacity-50 ease-md-bouncy active:scale-95 shadow-sm text-md-on-surface">Prev</button>
              <button className="w-9 h-9 flex items-center justify-center bg-md-primary text-md-on-primary rounded-full font-medium shadow-sm ease-md-bouncy active:scale-95">1</button>
              <button className="w-9 h-9 flex items-center justify-center bg-md-surface-container border border-md-outline/20 rounded-full hover:bg-md-surface-container-low transition-colors text-md-on-surface ease-md-bouncy active:scale-95 shadow-sm">2</button>
              <button className="w-9 h-9 flex items-center justify-center bg-md-surface-container border border-md-outline/20 rounded-full hover:bg-md-surface-container-low transition-colors text-md-on-surface ease-md-bouncy active:scale-95 shadow-sm">3</button>
              <button className="px-4 py-2 bg-md-surface-container border border-md-outline/20 rounded-full hover:bg-md-surface-container-low transition-colors ease-md-bouncy active:scale-95 shadow-sm text-md-on-surface">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
