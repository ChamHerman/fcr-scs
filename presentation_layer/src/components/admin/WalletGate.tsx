import React from 'react';
import { ShieldAlert, Wallet, RefreshCw, Loader2 } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { Button } from '../ui/Button';

/**
 * Route gate for the admin blockchain module. The authorised admin wallet must
 * be connected via MetaMask before any /admin/blockchain page renders:
 *  - not connected → prompt to connect the authorised admin wallet
 *  - connected with the wrong account → access blocked, mismatch shown, retry
 */
export const WalletGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { walletAddress, walletConnected, error, connectWallet, adminAddress, checking } = useWallet();

  if (checking) {
    return (
      <div className="flex items-center justify-center py-24 text-md-on-surface-variant">
        <Loader2 size={22} className="inline animate-spin mr-2" />
        Checking MetaMask connection…
      </div>
    );
  }

  if (!walletConnected) {
    const wrongAccount = Boolean(walletAddress);
    return (
      <div className="max-w-xl mx-auto my-10">
        <div className="bg-md-surface-container-low border border-md-outline/20 rounded-2xl px-8 py-10 text-center">
          <div
            className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full ${
              wrongAccount ? 'bg-md-error/10 text-md-error' : 'bg-md-primary/10 text-md-primary'
            }`}
          >
            {wrongAccount ? <ShieldAlert size={28} /> : <Wallet size={28} />}
          </div>

          <h1 className="text-xl font-bold text-md-on-surface mb-3">
            {wrongAccount ? 'Incorrect wallet address' : 'Admin wallet required'}
          </h1>

          {wrongAccount ? (
            <div className="space-y-3 text-sm text-md-on-surface-variant">
              <p>
                You are connected to MetaMask with{' '}
                <span className="font-mono text-md-error">{walletAddress}</span>, which is not the
                authorised admin wallet.
              </p>
              <p>
                The blockchain module is restricted to{' '}
                <span className="font-mono text-md-on-surface">{adminAddress}</span>. Switch to the
                authorised account in MetaMask, then try again.
              </p>
              <Button variant="filled" className="mt-2" onClick={connectWallet}>
                <RefreshCw size={14} className="mr-1" />
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-3 text-sm text-md-on-surface-variant">
              <p>
                The blockchain module can only be accessed with the authorised admin wallet. Connect{' '}
                <span className="font-mono text-md-on-surface">{adminAddress}</span> in MetaMask to
                continue.
              </p>
              <Button variant="filled" className="mt-2" onClick={connectWallet}>
                <Wallet size={14} className="mr-1" />
                Connect MetaMask
              </Button>
              {error && (
                <div className="bg-md-error/10 border border-md-error/30 text-md-on-error rounded-xl px-4 py-2.5">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
