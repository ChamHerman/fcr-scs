import { ethers } from "hardhat";

async function main() {
  console.log("Deploying to local Hardhat node...");
  const factory = await ethers.getContractFactory("FCRSCSLedger");
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("Local deploy address:", address);
  console.log("For local testing — set CONTRACT_ADDRESS=" + address + " in .env, set SEPOLIA_RPC_URL=http://127.0.0.1:8545");
}

main().catch(e => { console.error(e); process.exitCode = 1; });
