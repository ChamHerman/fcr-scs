/**
 * Error parsing and diagnostic utility for FCR-SCS.
 * Normalizes complex blockchain, RPC, network, and backend exceptions into
 * GA-friendly human explanations with actionable resolution guidance.
 */

export interface ParsedAppError {
  title: string;
  message: string;
  guidance?: string;
  category: string;
  rawDetails: string;
}

/**
 * Serializes any error, object, or string into a formatted raw technical string.
 */
export function serializeRawError(error: any): string {
  if (!error) return 'No technical details provided.';
  if (typeof error === 'string') return error;

  try {
    if (error instanceof Error) {
      const errObj: Record<string, any> = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
      // Include non-enumerable or attached properties (e.g. ethers, axios)
      for (const key of Object.getOwnPropertyNames(error)) {
        errObj[key] = (error as any)[key];
      }
      return JSON.stringify(errObj, null, 2);
    }
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

/**
 * Analyzes raw error input and returns a structured, user-friendly diagnostic object.
 */
export function parseAppError(error: any, fallbackTitle = 'Operation Failed'): ParsedAppError {
  const rawStr = serializeRawError(error);
  const errMessage = (error?.message || (typeof error === 'string' ? error : '')).toString();
  const searchCorpus = `${errMessage} ${rawStr}`.toLowerCase();

  // 1. Infura / Alchemy / RPC 401 Unauthorized or Invalid Project ID
  if (
    searchCorpus.includes('401 unauthorized') ||
    searchCorpus.includes('invalid project id') ||
    searchCorpus.includes('your_infura_or_alchemy_key') ||
    searchCorpus.includes('project id not found') ||
    (searchCorpus.includes('unauthorized') && searchCorpus.includes('requesturl'))
  ) {
    return {
      title: fallbackTitle,
      category: 'RPC Gateway Config',
      message: 'Blockchain RPC Gateway Authentication Failed (HTTP 401 Unauthorized).',
      guidance:
        'Your Ethereum RPC endpoint is unauthorized or using a placeholder API key. Please check your root .env file, configure a valid SEPOLIA_RPC_URL (from Infura or Alchemy), and restart your development server.',
      rawDetails: rawStr,
    };
  }

  // 2. MetaMask User Rejection
  if (
    error?.code === 4001 ||
    error?.code === 'ACTION_REJECTED' ||
    searchCorpus.includes('user rejected') ||
    searchCorpus.includes('rejected in metamask') ||
    searchCorpus.includes('user denied transaction signature')
  ) {
    return {
      title: fallbackTitle,
      category: 'MetaMask Signature',
      message: 'Transaction signature was rejected in MetaMask.',
      guidance:
        'The signature request was cancelled in MetaMask. No transaction was broadcast and no changes were recorded on-chain. You can retry whenever ready.',
      rawDetails: rawStr,
    };
  }

  // 3. Insufficient Funds for Gas
  if (
    searchCorpus.includes('insufficient funds') ||
    searchCorpus.includes('exceeds balance') ||
    searchCorpus.includes('gas * price + value')
  ) {
    return {
      title: fallbackTitle,
      category: 'Wallet Balance',
      message: 'Insufficient Sepolia ETH for Gas Fees.',
      guidance:
        'The connected Government Administrator wallet has insufficient Sepolia testnet ETH to pay the network gas fee. Please request testnet ETH from a Sepolia faucet.',
      rawDetails: rawStr,
    };
  }

  // 4. Smart Contract Execution Revert
  if (
    searchCorpus.includes('execution reverted') ||
    searchCorpus.includes('call_exception') ||
    searchCorpus.includes('reverted on chain') ||
    searchCorpus.includes('transaction reverted')
  ) {
    // Extract revert reason if available
    const revertMatch = rawStr.match(/reverted with reason string ['"]([^'"]+)['"]/i) ||
                       rawStr.match(/reason=['"]([^'"]+)['"]/i);
    const specificReason = revertMatch ? ` Reason: "${revertMatch[1]}"` : '';

    return {
      title: fallbackTitle,
      category: 'Contract Revert',
      message: `Smart Contract Execution Reverted.${specificReason}`,
      guidance:
        'The Ethereum smart contract rejected the transaction. The statutory record may already be notarized on-chain, or the input parameters did not satisfy validation rules.',
      rawDetails: rawStr,
    };
  }

  // 5. Gas Estimation Failure / Simulation Failure
  if (
    searchCorpus.includes('gas estimation failed') ||
    searchCorpus.includes('transaction would fail on-chain')
  ) {
    return {
      title: fallbackTitle,
      category: 'Gas Estimation',
      message: 'Transaction Simulation Failed.',
      guidance:
        'The Ethereum node could not simulate the transaction execution. Please verify your wallet permissions and ensure the case milestone is eligible for notarization.',
      rawDetails: rawStr,
    };
  }

  // 6. Chain / Network Mismatch
  if (
    searchCorpus.includes('wallet_switchethereumchain') ||
    searchCorpus.includes('unrecognized chain') ||
    searchCorpus.includes('wrong network')
  ) {
    return {
      title: fallbackTitle,
      category: 'Chain Configuration',
      message: 'Incorrect Blockchain Network.',
      guidance:
        'Please switch your MetaMask network to Ethereum Sepolia Testnet (Chain ID: 11155111 / 0xaa36a7) and try again.',
      rawDetails: rawStr,
    };
  }

  // 7. MetaMask Missing
  if (
    searchCorpus.includes('metamask extension is required') ||
    searchCorpus.includes('no ethereum provider')
  ) {
    return {
      title: fallbackTitle,
      category: 'Wallet Missing',
      message: 'MetaMask Extension Not Detected.',
      guidance:
        'Please install or enable the MetaMask browser extension and ensure an authorized Government Administrator wallet is connected.',
      rawDetails: rawStr,
    };
  }

  // 8. Network Offline / Connection Timeout / CORS
  if (
    searchCorpus.includes('econnrefused') ||
    searchCorpus.includes('failed to fetch') ||
    searchCorpus.includes('networkerror') ||
    searchCorpus.includes('timeout') ||
    searchCorpus.includes('timed out')
  ) {
    return {
      title: fallbackTitle,
      category: 'Network Connection',
      message: 'Network Connection Failed or Timed Out.',
      guidance:
        'Unable to communicate with the blockchain node or backend API service. Check your internet connection and verify that local services (port 3030) are running.',
      rawDetails: rawStr,
    };
  }

  // 9. HTTP 403 Forbidden
  if (searchCorpus.includes('403 forbidden') || searchCorpus.includes('unauthorized role')) {
    return {
      title: fallbackTitle,
      category: 'Access Control',
      message: 'Administrative Access Denied.',
      guidance:
        'Your current account or connected wallet lacks statutory Government Administrator permissions to perform this action.',
      rawDetails: rawStr,
    };
  }

  // 10. HTTP 500 Internal Server Error
  if (searchCorpus.includes('500 internal server error')) {
    return {
      title: fallbackTitle,
      category: 'Backend Error',
      message: 'Internal Backend Service Error (HTTP 500).',
      guidance:
        'The backend server encountered an error while processing the request. Check backend console logs for detailed stack traces.',
      rawDetails: rawStr,
    };
  }

  // Default Fallback: Truncate raw message if too technical or long
  let cleanMessage = errMessage.trim();
  if (!cleanMessage || cleanMessage.startsWith('{') || cleanMessage.includes('server response')) {
    cleanMessage = 'An unexpected system error occurred during execution.';
  } else if (cleanMessage.length > 140) {
    cleanMessage = cleanMessage.slice(0, 137) + '…';
  }

  return {
    title: fallbackTitle,
    category: 'System Error',
    message: cleanMessage,
    guidance: 'Review the technical diagnostics in the Error Details modal or contact technical support.',
    rawDetails: rawStr,
  };
}

/**
 * True when the current page belongs to the admin portal — the only place that
 * keeps the full diagnostic treatment (SYSTEM ERROR chip, Error Details modal,
 * "contact technical support" guidance). Every other page (public, member, bank)
 * uses the plain short-message toast.
 */
export function isAdminAudience(): boolean {
  try {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    return path.startsWith('/admin');
  } catch {
    return false;
  }
}

/** Back-compat alias kept for any external import sites. */
export const isMemberAudience = isAdminAudience;

const MEMBER_NEXT_STEP = 'Please try again. If it keeps happening, find our support team.';

// Technical markers that mean a message is not fit for a member-facing toast.
const MEMBER_TECHNICAL_MARKERS = [
  '{',
  'http ',
  'code=',
  'requesturl',
  'server response',
  'scs-be-',
  '0x',
  'error:',
  'exception',
  'gateway',
];

/**
 * Builds a short, plain-language message for member-portal error toasts:
 * what happened + a single next step. Nothing technical, no diagnostics.
 */
export function memberErrorMessage(
  rawMessage: string | undefined,
  parsed: ParsedAppError,
): string {
  let what: string;

  const trimmed = (rawMessage || '').trim();
  const isCleanHuman =
    trimmed.length > 0 &&
    trimmed.length <= 110 &&
    !MEMBER_TECHNICAL_MARKERS.some((m) => trimmed.toLowerCase().includes(m)) &&
    !/\d{9,}/.test(trimmed);

  if (isCleanHuman) {
    what = trimmed;
  } else {
    switch (parsed.category) {
      case 'Network Connection':
        what = "We couldn't reach the server. Check your internet connection and try again.";
        break;
      case 'Access Control':
        what = "You don't have permission to do this.";
        break;
      case 'Backend Error':
      case 'System Error':
        what = 'Something went wrong on our side.';
        break;
      default:
        what = 'Something went wrong.';
    }
  }

  // Don't tack on a second retry instruction when the phrase already has one.
  if (/try again/i.test(what)) return what;
  return `${what.replace(/\s*\.?\s*$/, '')}. ${MEMBER_NEXT_STEP}`;
}
