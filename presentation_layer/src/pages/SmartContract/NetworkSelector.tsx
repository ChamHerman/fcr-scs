import React from 'react';
import { Globe } from 'lucide-react';

export interface NetworkInfo {
  name: string;
  label?: string;
  chainId: number;
}

export interface NetworkStatusBadgeProps {
  networkInfo: NetworkInfo | null;
  status?: 'online' | 'connecting' | 'error';
  className?: string;
}

export const NetworkStatusBadge: React.FC<NetworkStatusBadgeProps> = ({ networkInfo, status, className = '' }) => {
  const isOnline = status === 'online' || (status === undefined && Boolean(networkInfo));
  const isConnecting = status === 'connecting' || (!networkInfo && status !== 'error');
  const isError = status === 'error';

  const dotColor = isError
    ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
    : isConnecting
    ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse'
    : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]';

  const label = networkInfo?.label || (networkInfo?.name === 'mainnet' ? 'Ethereum Mainnet' : 'Sepolia Testnet');
  const chainId = networkInfo?.chainId || (networkInfo?.name === 'mainnet' ? 1 : 11155111);

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-md-surface-container-low border border-md-outline/20 text-md-on-surface shadow-sm ${className}`}
      title={`Active Blockchain Network: ${label} (Chain ID: ${chainId})`}
    >
      <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <Globe size={13} className="text-md-on-surface-variant shrink-0" />
      <span>{label}</span>
      <span className="text-[10px] opacity-60 font-mono">({chainId})</span>
    </div>
  );
};

// Backward-compatible alias
export const NetworkSelector = NetworkStatusBadge;
