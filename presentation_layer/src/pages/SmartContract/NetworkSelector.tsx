import React, { useState } from 'react';
import { Globe, Check, ChevronDown, ShieldCheck } from 'lucide-react';
import { blockchainApi } from '../../services/blockchainApi';
import { useNotification } from '../../components/ui/NotificationSystem';

export interface NetworkInfo {
  name: string;
  label?: string;
  chainId: number;
}

interface NetworkSelectorProps {
  networkInfo: NetworkInfo | null;
  onNetworkChange: (net: NetworkInfo) => void;
}

const AVAILABLE_NETWORKS = [
  { key: 'sepolia', label: 'Sepolia Testnet', chainId: 11155111, badge: 'Ethereum Testnet (Default)', color: 'text-amber-500' },
  { key: 'mainnet', label: 'Ethereum Mainnet', chainId: 1, badge: 'Simulation Only', color: 'text-purple-500' },
];

export const NetworkSelector: React.FC<NetworkSelectorProps> = ({ networkInfo, onNetworkChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const { notify } = useNotification();

  const currentKey = networkInfo?.name || 'sepolia';
  const currentNetwork = AVAILABLE_NETWORKS.find((n) => n.key === currentKey) || AVAILABLE_NETWORKS[0];

  const handleSelect = async (key: string) => {
    if (key === currentKey) {
      setIsOpen(false);
      return;
    }
    try {
      setSwitching(true);
      const updated = await blockchainApi.setNetwork(key);
      onNetworkChange({
        name: updated.key || key,
        label: updated.label,
        chainId: updated.chainId,
      });
      notify({
        type: 'success',
        title: 'Network Switched',
        message: `Switched active blockchain environment to ${updated.label || key}`,
      });
    } catch (e: any) {
      notify({
        type: 'error',
        title: 'Network Switch Failed',
        message: e.message || 'Could not switch network.',
      });
    } finally {
      setSwitching(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-md-surface-container-low border border-md-outline/30 text-md-on-surface hover:bg-md-surface-container transition-colors shadow-sm"
        title="Switch Blockchain Network"
      >
        <span className={`inline-block w-2 h-2 rounded-full ${currentKey === 'sepolia' ? 'bg-amber-500' : 'bg-purple-500'}`} />
        <Globe size={13} className="text-md-on-surface-variant" />
        <span>{networkInfo?.label || currentNetwork.label}</span>
        <span className="text-[10px] opacity-60 font-mono">({networkInfo?.chainId || currentNetwork.chainId})</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-md-surface-container border border-md-outline/20 shadow-xl z-50 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-md-outline/10">
              <div className="text-[11px] font-bold uppercase tracking-wider text-md-on-surface-variant">
                Blockchain Target Network
              </div>
              <div className="text-[11px] text-md-on-surface-variant opacity-80 mt-0.5">
                Runtime switch — resets when the service restarts
              </div>
            </div>

            <div className="py-1">
              {AVAILABLE_NETWORKS.map((net) => {
                const isSelected = net.key === currentKey;
                return (
                  <button
                    key={net.key}
                    type="button"
                    onClick={() => handleSelect(net.key)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-md-surface-container-low transition-colors ${
                      isSelected ? 'bg-md-secondary-container/50 font-semibold' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck size={14} className={net.color} />
                      <div>
                        <div className="text-md-on-surface">{net.label}</div>
                        <div className="text-[10px] text-md-on-surface-variant opacity-70 font-mono">
                          Chain ID {net.chainId} · {net.badge}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check size={14} className="text-md-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
