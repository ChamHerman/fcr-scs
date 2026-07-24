import React, { useState } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  Blocks
} from 'lucide-react';

export const BlockchainDashboard: React.FC = () => {
  const [walletConnected, setWalletConnected] = useState(true);

  const stats = [
    { title: 'Published Records', value: '12,405', icon: CheckCircle2, color: 'text-md-on-success', bg: 'bg-md-success' },
    { title: 'Pending Transactions', value: '34', icon: Clock, color: 'text-md-on-warning', bg: 'bg-md-warning' },
    { title: 'Voided Records', value: '142', icon: XCircle, color: 'text-md-on-error', bg: 'bg-md-error' },
  ];

  return (
    <div className="min-h-screen bg-md-background text-md-on-surface p-8 font-sans selection:bg-md-secondary-container">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-md-surface-container backdrop-blur-xl border border-md-outline/20 p-6 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-md-secondary-container rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 bg-md-secondary-container rounded-xl border border-md-outline/20">
              <Blocks className="w-8 h-8 text-md-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-md-on-surface">
                Blockchain Overview
              </h1>
              <p className="text-md-on-surface-variant mt-1">Monitor real-time ledger activities and smart contract status.</p>
            </div>
          </div>
          
          <div className="relative z-10">
            <button 
              onClick={() => setWalletConnected(!walletConnected)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-300 ease-md-bouncy border shadow-sm active:scale-95 ${
                walletConnected 
                  ? 'bg-md-success border-md-success text-md-on-success hover:opacity-90' 
                  : 'bg-md-primary border-md-primary text-md-on-primary hover:opacity-90'
              }`}
            >
              <Wallet className="w-5 h-5" />
              {walletConnected ? '0x71C...9A23 connected' : 'Connect MetaMask'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-md-surface-container backdrop-blur-md border border-md-outline/20 rounded-lg p-6 hover:border-md-outline/40 hover:shadow-md transition-all ease-md-bouncy hover:scale-[1.02] group shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-md-on-surface-variant font-medium mb-2">{stat.title}</p>
                  <h3 className="text-4xl font-bold tracking-tight text-md-on-surface">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="flex items-center text-md-on-success bg-md-success px-2 py-0.5 rounded-full">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  2.4%
                </span>
                <span className="text-md-on-surface-variant">vs last month</span>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-md-surface-container backdrop-blur-md border border-md-outline/20 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-md-on-surface">
              <Activity className="w-5 h-5 text-md-primary" />
              Recent Ledger Activity
            </h2>
            <button className="text-sm text-md-primary hover:opacity-80 font-medium transition-colors ease-md-bouncy active:scale-95">
              View All Explorer
            </button>
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3, 4].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-md-surface-container-low border border-md-outline/10 hover:bg-md-surface-container transition-colors shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-md-secondary-container rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-md-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-md-on-surface">Contract Executed: Record #{4892 - i * 14}</p>
                    <p className="text-sm text-md-on-surface-variant">TxHash: 0x9f8c...3b1a • {i * 2 + 2} mins ago</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-md-success text-md-on-success border border-md-success/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-md-on-success"></span>
                    Confirmed
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
