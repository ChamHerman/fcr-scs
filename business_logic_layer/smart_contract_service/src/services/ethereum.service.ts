import { ethers } from "ethers";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config();

function loadAbi() {
  const abiPath = path.resolve(
    __dirname,
    "../../../../data_layer/blockchain_ledger/artifacts/contracts/CompensationLedger.sol/CompensationLedger.json"
  );
  if (fs.existsSync(abiPath)) {
    return JSON.parse(fs.readFileSync(abiPath, "utf-8"));
  }
  const altPath = path.resolve(
    process.cwd(),
    "../../data_layer/blockchain_ledger/artifacts/contracts/CompensationLedger.sol/CompensationLedger.json"
  );
  return JSON.parse(fs.readFileSync(altPath, "utf-8"));
}

const ABI = loadAbi();

let _provider: ethers.JsonRpcProvider | null = null;
let _contract: ethers.Contract | null = null;

function getRpcUrl(): string {
  const url = process.env.SEPOLIA_RPC_URL;
  if (!url) throw new Error("SEPOLIA_RPC_URL not set in .env");
  return url;
}

function isLocalNode(): boolean {
  const url = getRpcUrl();
  return url.includes("127.0.0.1") || url.includes("localhost");
}

function getContract(): ethers.Contract {
  if (!_contract) {
    _provider = new ethers.JsonRpcProvider(getRpcUrl());
    const walletKey = process.env.DEPLOYER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const wallet = new ethers.Wallet(walletKey, _provider);
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress) throw new Error("CONTRACT_ADDRESS not set in .env");
    _contract = new ethers.Contract(contractAddress, ABI.abi, wallet);

    const networkType = isLocalNode() ? "Hardhat local node" : "Sepolia testnet";
    console.log(`[${new Date().toISOString()}] [INFO] [ethereum-service] Connected to ${networkType} at ${getRpcUrl()}`);
  }
  return _contract;
}

export function resetContractCache(): void {
  _provider = null;
  _contract = null;
}

export async function getNetworkInfo(): Promise<{ name: string; chainId: number; isLocal: boolean }> {
  getContract();
  const network = await _provider!.getNetwork();
  return {
    name: isLocalNode() ? "hardhat-local" : "sepolia",
    chainId: Number(network.chainId),
    isLocal: isLocalNode(),
  };
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
