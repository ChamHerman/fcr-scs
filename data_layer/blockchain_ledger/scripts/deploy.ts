import { ethers } from "hardhat";

async function main() {
  const c = await (await ethers.getContractFactory("CompensationLedger")).deploy();
  await c.waitForDeployment();
  console.log("Deployed to:", await c.getAddress());
  console.log("Set CONTRACT_ADDRESS=<above address> in .env");
}

main().catch(e => { console.error(e); process.exitCode = 1; });
