import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const network = await ethers.provider.getNetwork();
  console.log("Deploying to network:", network.name, "(chainId:", network.chainId.toString() + ")");

  if (network.chainId !== 11155111n) {
    throw new Error("Wrong network. This script is for Sepolia (chainId 11155111) only.");
  }

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Deployer has no Sepolia ETH. Get free testnet ETH from https://sepoliafaucet.com or https://www.alchemy.com/faucets/ethereum-sepolia");
  }

  const factory = await ethers.getContractFactory("FCRSCSLedger");
  console.log("Deploying FCRSCSLedger...");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();

  console.log("\n=== DEPLOYMENT SUCCESSFUL ===");
  console.log("Contract address:", address);
  console.log("Transaction hash:", deployTx?.hash);
  console.log("Etherscan:", "https://sepolia.etherscan.io/address/" + address);
  console.log("\nUpdate your .env:");
  console.log("CONTRACT_ADDRESS=" + address);
  console.log("SEPOLIA_RPC_URL=<your Infura/Alchemy URL>");

  // Write deployment record
  const record = {
    network: "sepolia",
    chainId: 11155111,
    contractAddress: address,
    txHash: deployTx?.hash,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };
  const recordPath = path.join(__dirname, "../deployments/sepolia.json");
  fs.mkdirSync(path.dirname(recordPath), { recursive: true });
  fs.writeFileSync(recordPath, JSON.stringify(record, null, 2));
  console.log("Deployment record saved to deployments/sepolia.json");
}

main().catch(e => { console.error(e); process.exitCode = 1; });
