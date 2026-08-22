import { ethers } from "ethers";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

const envPaths = [
  path.resolve(__dirname, "../../../../../.env"),
  path.resolve(__dirname, "../../../../.env"),
  path.resolve(__dirname, "../../../.env"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}
dotenv.config();

function loadAbi() {
  const candidates = [
    path.resolve(__dirname, "../../../../../data_layer/blockchain_ledger/artifacts/contracts/CompensationLedger.sol/CompensationLedger.json"),
    path.resolve(__dirname, "../../../../data_layer/blockchain_ledger/artifacts/contracts/CompensationLedger.sol/CompensationLedger.json"),
    path.resolve(process.cwd(), "../data_layer/blockchain_ledger/artifacts/contracts/CompensationLedger.sol/CompensationLedger.json"),
    path.resolve(process.cwd(), "data_layer/blockchain_ledger/artifacts/contracts/CompensationLedger.sol/CompensationLedger.json"),
    path.resolve(process.cwd(), "../../data_layer/blockchain_ledger/artifacts/contracts/CompensationLedger.sol/CompensationLedger.json"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return JSON.parse(fs.readFileSync(candidate, "utf-8"));
    }
  }
  throw new Error("CompensationLedger.json ABI file not found");
}

const ABI = loadAbi();

export type NetworkKey = "sepolia" | "mainnet";

export interface NetworkConfig {
  key: NetworkKey;
  label: string;
  rpcUrl: string;
  contractAddress: string | undefined;
  chainId: number;
}

/**
 * Network registry. The admin Settings page can switch the active network at
 * runtime (POST /api/smart-contract/network); the switch is in-memory and
 * resets on service restart, defaulting to ACTIVE_NETWORK (or sepolia).
 */
function readNetworkConfig(): Record<NetworkKey, NetworkConfig> {
  return {
    sepolia: {
      key: "sepolia",
      label: "Sepolia Testnet",
      rpcUrl: process.env.SEPOLIA_RPC_URL ?? "https://sepolia.infura.io/v3/b4aa988d9c9b443987922954de0f7de9",
      contractAddress: process.env.SEPOLIA_CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS || "0x5539d016e1A4Bd1e51d17D976D1ff05cb452B428",
      chainId: 11155111,
    },
    mainnet: {
      key: "mainnet",
      label: "Ethereum Mainnet (Simulation)",
      rpcUrl: process.env.MAINNET_RPC_URL ?? "",
      contractAddress: process.env.MAINNET_CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS,
      chainId: 1,
    },
  };
}

const NETWORKS = readNetworkConfig();
const NETWORK_KEYS = Object.keys(NETWORKS) as NetworkKey[];

let activeNetworkKey: NetworkKey =
  NETWORK_KEYS.includes(process.env.ACTIVE_NETWORK as NetworkKey)
    ? (process.env.ACTIVE_NETWORK as NetworkKey)
    : "sepolia";

export function getActiveNetwork(): NetworkConfig {
  return NETWORKS[activeNetworkKey];
}

export function setActiveNetwork(key: string): NetworkConfig {
  if (!NETWORK_KEYS.includes(key as NetworkKey)) {
    throw new Error(`Unknown network "${key}". Valid options: ${NETWORK_KEYS.join(", ")}`);
  }
  activeNetworkKey = key as NetworkKey;
  resetContractCache();
  return NETWORKS[activeNetworkKey];
}

let _provider: ethers.JsonRpcProvider | null = null;
let _contract: ethers.Contract | null = null;

function getRpcUrl(): string {
  const url = getActiveNetwork().rpcUrl;
  if (!url) throw new Error(`No RPC URL configured for network "${activeNetworkKey}"`);
  return url;
}

function getContract(): ethers.Contract {
  if (!_contract) {
    const net = getActiveNetwork();
    _provider = new ethers.JsonRpcProvider(net.rpcUrl);
    const contractAddress = net.contractAddress;
    if (!contractAddress) throw new Error(`CONTRACT_ADDRESS not set for network "${activeNetworkKey}"`);
    // Read-only connection — write transactions come from the admin wallet in
    // MetaMask; the backend never holds a signing key.
    _contract = new ethers.Contract(contractAddress, ABI.abi, _provider);

    console.log(`[${new Date().toISOString()}] [INFO] [ethereum-service] Connected to ${net.label} at ${net.rpcUrl}`);
  }
  return _contract;
}

export function resetContractCache(): void {
  _provider = null;
  _contract = null;
}

export function getActiveContractAddress(): string | undefined {
  return getActiveNetwork().contractAddress;
}

export interface ReceiptVerification {
  found: boolean;
  success: boolean;
  to?: string;
}

/**
 * Verifies a transaction the ADMIN WALLET sent via MetaMask: it must be mined
 * on the active network, must not have reverted, and must have targeted the
 * CompensationLedger contract. Retries briefly — a just-mined tx can take a
 * moment to appear on the read RPC.
 */
export async function verifyTransactionReceipt(
  transactionHash: string,
  attempts = 3,
  delayMs = 2_000
): Promise<ReceiptVerification> {
  const provider = new ethers.JsonRpcProvider(getRpcUrl());
  for (let attempt = 0; attempt < attempts; attempt++) {
    const receipt = await provider.getTransactionReceipt(transactionHash);
    if (receipt) {
      return { found: true, success: receipt.status === 1, to: receipt.to?.toLowerCase() };
    }
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return { found: false, success: false };
}

export async function getNetworkInfo(): Promise<{ name: string; label: string; chainId: number; contractAddress?: string }> {
  const net = getActiveNetwork();
  // Best-effort chain id from the provider; fall back to the configured id so
  // the switch UI never hard-fails when an RPC/contract isn't reachable yet.
  let chainId = net.chainId;
  try {
    getContract();
    const network = await _provider!.getNetwork();
    chainId = Number(network.chainId);
  } catch {
    // provider or contract not reachable — configured chain id stands
  }
  return { name: net.key, label: net.label, chainId, contractAddress: net.contractAddress };
}

export async function getRecordFromBlockchain(caseId: string) {
  const [documentHash, publishedAt, isVoided, voidReason, voidedAt] =
    await getContract().getRecord(caseId);
  return {
    documentHash: documentHash as string,
    publishedAt: Number(publishedAt),
    isVoided: isVoided as boolean,
    voidReason: voidReason as string,
    voidedAt: Number(voidedAt),
  };
}
