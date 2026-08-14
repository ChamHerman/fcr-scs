import { ethers } from "ethers";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";
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

export type NetworkKey = "sepolia" | "local" | "mainnet";

export interface NetworkConfig {
  key: NetworkKey;
  label: string;
  rpcUrl: string;
  contractAddress: string | undefined;
  chainId: number;
  isLocal: boolean;
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
      rpcUrl: process.env.SEPOLIA_RPC_URL ?? "",
      contractAddress: process.env.CONTRACT_ADDRESS,
      chainId: 11155111,
      isLocal: false,
    },
    local: {
      key: "local",
      label: "Hardhat Local Node",
      rpcUrl: process.env.LOCAL_RPC_URL ?? "http://127.0.0.1:8545",
      contractAddress: process.env.LOCAL_CONTRACT_ADDRESS,
      chainId: 31337,
      isLocal: true,
    },
    mainnet: {
      key: "mainnet",
      label: "Ethereum Mainnet",
      rpcUrl: process.env.MAINNET_RPC_URL ?? "",
      contractAddress: process.env.MAINNET_CONTRACT_ADDRESS,
      chainId: 1,
      isLocal: false,
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
    const walletKey = process.env.DEPLOYER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const wallet = new ethers.Wallet(walletKey, _provider);
    const contractAddress = net.contractAddress;
    if (!contractAddress) throw new Error(`CONTRACT_ADDRESS not set for network "${activeNetworkKey}"`);
    _contract = new ethers.Contract(contractAddress, ABI.abi, wallet);

    console.log(`[${new Date().toISOString()}] [INFO] [ethereum-service] Connected to ${net.label} at ${net.rpcUrl}`);
  }
  return _contract;
}

export function resetContractCache(): void {
  _provider = null;
  _contract = null;
}

export async function getNetworkInfo(): Promise<{ name: string; label: string; chainId: number; isLocal: boolean }> {
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
  return { name: net.key, label: net.label, chainId, isLocal: net.isLocal };
}

export async function publishToBlockchain(caseId: string, documentHash: string) {
  const tx = await getContract().publishRecord(caseId, documentHash);
  const receipt = await tx.wait();
  return { transactionHash: receipt.hash as string };
}

export async function voidOnBlockchain(caseId: string, reason: string) {
  const tx = await getContract().voidRecord(caseId, reason);
  const receipt = await tx.wait();
  return { transactionHash: receipt.hash as string };
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
