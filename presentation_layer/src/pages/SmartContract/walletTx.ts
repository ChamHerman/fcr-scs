import { ethers } from 'ethers';

/**
 * MetaMask transaction helpers for the blockchain module. Transactions are
 * signed by the ADMIN WALLET in MetaMask (eth_sendTransaction) — the backend
 * never signs; it only verifies the resulting receipt and records it.
 */

const getEthereum = () => (window as any).ethereum;

// Human-readable ABI fragment for publication.
// NOTE: the contract declares publishRecord(string, bytes32) — a string/string
// ABI here would encode a selector the contract does not have, the estimate
// would revert, and MetaMask would fall back to a 21,000,000 gas default that
// Infura rejects (cap 16,777,216).
const COMPENSATION_LEDGER_ABI = [
  'function publishRecord(string caseId, bytes32 documentHash)',
];

/** Normalises a document hash to an exact 32-byte hex value (bytes32). */
const toBytes32 = (value: string): string => {
  let hex = value.trim();
  if (hex.startsWith('0x')) hex = hex.slice(2);
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error('Invalid document hash — expected a hex string, got a non-hex value.');
  }
  if (hex.length > 64) throw new Error('Invalid document hash — longer than 32 bytes.');
  return '0x' + hex.padStart(64, '0');
};

/** Digs the on-chain revert reason out of a MetaMask/JSON-RPC error, if any. */
const revertReason = (e: any): string | null => {
  const candidates = [e?.data?.originalError?.message, e?.data?.message, e?.error?.message, e?.message];
  return candidates.find((m) => typeof m === 'string' && /revert/i.test(m)) ?? null;
};

const SEPOLIA_CHAIN_PARAMS = {
  chainId: '0xaa36a7',
  chainName: 'Sepolia Testnet',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'SEP', decimals: 18 },
  rpcUrls: ['https://sepolia.infura.io/v3/b4aa988d9c9b443987922954de0f7de9'],
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
};

/** Error message normalisation — MetaMask rejections read as plain instructions. */
const describeWalletError = (e: any, action: string): Error => {
  if (e?.code === 4001 || e?.code === 'ACTION_REJECTED') {
    return new Error(`${action} was rejected in MetaMask.`);
  }
  return new Error(e?.message || `${action} failed in MetaMask.`);
};

/**
 * MetaMask does not answer every request: a dismissed popup, a locked wallet or
 * a dropped extension port leaves `ethereum.request` pending forever. Every
 * wallet call is therefore raced against a timeout so the publish dialog always
 * reaches an error state instead of spinning indefinitely.
 */
const WALLET_PROMPT_TIMEOUT_MS = 5 * 60_000;
const WALLET_RPC_TIMEOUT_MS = 30_000;

const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/** Ensures MetaMask is on the target chain, switching (or adding Sepolia) if needed. */
export async function ensureChain(chainId: number): Promise<void> {
  const ethereum = getEthereum();
  if (!ethereum) throw new Error('MetaMask extension is required.');
  const target = '0x' + chainId.toString(16);
  const current: string = await withTimeout(
    ethereum.request({ method: 'eth_chainId' }),
    WALLET_RPC_TIMEOUT_MS,
    'MetaMask did not respond while checking the active network. Open the MetaMask extension and try again.',
  );
  if (current?.toLowerCase() === target.toLowerCase()) return;
  try {
    await withTimeout(
      ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: target }] }),
      WALLET_PROMPT_TIMEOUT_MS,
      'MetaMask did not respond to the network switch request. Open the MetaMask extension and try again.',
    );
  } catch (e: any) {
    if (e?.code === 4902 || /unrecognized chain/i.test(e?.message || '')) {
      if (target === SEPOLIA_CHAIN_PARAMS.chainId) {
        await withTimeout(
          ethereum.request({ method: 'wallet_addEthereumChain', params: [SEPOLIA_CHAIN_PARAMS] }),
          WALLET_PROMPT_TIMEOUT_MS,
          'MetaMask did not respond to the add-network request. Open the MetaMask extension and try again.',
        );
        return;
      }
    }
    throw describeWalletError(e, `Switching MetaMask to chain ${chainId}`);
  }
}

/** Prompts MetaMask to sign + send a CompensationLedger call; resolves with the tx hash. */
export async function sendLedgerTransaction(params: {
  from: string;
  functionName?: 'publishRecord';
  args: string[];
  network: { chainId: number; contractAddress: string };
}): Promise<string> {
  const ethereum = getEthereum();
  if (!ethereum) throw new Error('MetaMask extension is required.');

  await ensureChain(params.network.chainId);

  const iface = new ethers.Interface(COMPENSATION_LEDGER_ABI);
  const args = [params.args[0], toBytes32(params.args[1])];
  const data = iface.encodeFunctionData('publishRecord', args);
  const request: Record<string, string> = { from: params.from, to: params.network.contractAddress, data };

  // Estimate gas up front and pass it explicitly. MetaMask's 21,000,000 default
  // fallback (used when estimation fails) exceeds Infura's per-tx cap of
  // 16,777,216, so the broadcast would be rejected outright. If the call would
  // revert on-chain, surface the reason now instead of sending a doomed tx.
  try {
    const estimate = await withTimeout(
      ethereum.request({ method: 'eth_estimateGas', params: [request] }),
      WALLET_RPC_TIMEOUT_MS,
      'MetaMask did not respond to the gas estimation request. Open the MetaMask extension and try again.',
    );
    const estimated = typeof estimate === 'string' ? parseInt(estimate, 16) : Number(estimate);
    const gas = Math.min(Math.floor(estimated * 1.3) + 20_000, 15_000_000);
    request.gas = '0x' + gas.toString(16);
  } catch (e: any) {
    // A silent wallet is not a chain rejection — keep its own message intact.
    if (/did not respond/i.test(e?.message || '')) throw e;
    throw new Error(
      `Transaction would fail on-chain: ${revertReason(e) ?? 'gas estimation failed — see MetaMask for details.'}`,
    );
  }

  try {
    return await withTimeout(
      ethereum.request({ method: 'eth_sendTransaction', params: [request] }),
      WALLET_PROMPT_TIMEOUT_MS,
      'MetaMask did not answer the signature request. Open the MetaMask extension, approve or reject the transaction, then try again.',
    );
  } catch (e: any) {
    throw describeWalletError(e, 'The transaction');
  }
}

/** Waits until the tx is mined; throws if it reverts or times out. */
export async function waitForLedgerReceipt(txHash: string, timeoutMs = 120_000): Promise<string> {
  const provider = new ethers.BrowserProvider(getEthereum());
  const receipt = await provider.waitForTransaction(txHash, 1, timeoutMs);
  if (!receipt) throw new Error('Transaction was not mined within 2 minutes — check the explorer and retry.');
  if (receipt.status !== 1) throw new Error('Transaction reverted on chain — nothing was recorded.');
  return receipt.hash;
}
