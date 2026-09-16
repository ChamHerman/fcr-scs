import { useState, useEffect, useCallback } from 'react';
import { useNotification } from '../components/ui/NotificationSystem';

const getEthereum = () => (window as any).ethereum;

/**
 * MetaMask wallet state for the blockchain module. Nothing is faked: the wallet
 * starts disconnected and only becomes "connected" when MetaMask reports the
 * authorised admin account. A connected-but-different account keeps the actual
 * address in `walletAddress` (so the UI can show the mismatch) with
 * `walletConnected` false.
 */
export const useWallet = () => {
  const adminAddress = import.meta.env.VITE_ADMIN_WALLET_ADDRESS || '0x8F66b4902858b8Dc6cb1bdD4C3cF040101CcC409';
  const { notify } = useNotification();
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [checking, setChecking] = useState<boolean>(true);

  const applyAccount = useCallback(
    (address: string | null) => {
      if (address && address.toLowerCase() === adminAddress.toLowerCase()) {
        setWalletAddress(address);
        setWalletConnected(true);
        setError('');
        return true;
      }
      setWalletConnected(false);
      setWalletAddress(address || '');
      if (address) {
        setError(
          `Incorrect wallet address. Connected as ${address.slice(0, 8)}…${address.slice(-6)}, expected the authorised admin wallet ${adminAddress.slice(0, 8)}…${adminAddress.slice(-6)}. Switch account in MetaMask and try again.`
        );
      } else {
        setError('');
      }
      return false;
    },
    [adminAddress]
  );

  const connectWallet = async () => {
    const ethereum = getEthereum();
    if (!ethereum) {
      const msg = 'MetaMask extension is required to access the blockchain module.';
      setError(msg);
      notify({
        type: 'error',
        title: 'MetaMask Required',
        message: msg,
        guidance: 'Please install or enable MetaMask in your browser, then refresh the page.',
      });
      return;
    }
    try {
      const accounts: string[] = await ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        applyAccount(accounts[0]);
      } else {
        applyAccount(null);
      }
    } catch (err: any) {
      const isRejected =
        err?.code === 4001 ||
        err?.code === 'ACTION_REJECTED' ||
        String(err?.message || '').toLowerCase().includes('user rejected') ||
        String(err?.message || '').toLowerCase().includes('user cancelled') ||
        String(err?.message || '').toLowerCase().includes('rejected the request');

      if (isRejected) {
        // Clear small in-card error text and trigger standard error toast notification
        setError('');
        notify({
          type: 'error',
          title: 'Connection Cancelled',
          message: 'MetaMask connection request was cancelled. Please authorize the connection to access the blockchain module.',
          guidance: 'Click "Connect MetaMask" and confirm the connection prompt in your MetaMask extension.',
        });
      } else {
        const errorMsg = err?.message || 'Failed to connect wallet';
        setError(errorMsg);
        notify({
          type: 'error',
          title: 'Wallet Connection Failed',
          message: errorMsg,
          guidance: 'Check that MetaMask is unlocked and try again, or contact technical support.',
        });
      }
    }
  };

  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) {
      setChecking(false);
      return;
    }

    let cancelled = false;
    ethereum
      .request({ method: 'eth_accounts' })
      .then((accounts: string[]) => {
        if (cancelled) return;
        if (accounts && accounts.length > 0) applyAccount(accounts[0]);
        setChecking(false);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });

    const onAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        applyAccount(accounts[0]);
      } else {
        setWalletAddress('');
        setWalletConnected(false);
        setError('');
      }
    };
    ethereum.on('accountsChanged', onAccountsChanged);
    return () => {
      cancelled = true;
      ethereum.removeListener?.('accountsChanged', onAccountsChanged);
    };
  }, [applyAccount]);

  return {
    walletAddress,
    walletConnected,
    error,
    setError,
    connectWallet,
    adminAddress,
    checking,
  };
};
