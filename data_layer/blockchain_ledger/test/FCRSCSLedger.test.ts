import { expect } from "chai";
import { ethers } from "hardhat";

describe("FCRSCSLedger", function () {
  let contract: any, owner: any, nonOwner: any;

  beforeEach(async function () {
    [owner, nonOwner] = await ethers.getSigners();
    contract = await (await ethers.getContractFactory("FCRSCSLedger")).deploy();
  });

  describe("publishRecord", function () {
    it("emits RecordPublished on success", async () => {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("doc"));
      await expect(contract.publishRecord("CASE-001", [hash]))
        .to.emit(contract, "RecordPublished").withArgs("CASE-001", [hash], (v: bigint) => v > 0n);
    });
    it("anchors multiple owner hashes in one record", async () => {
      const h1 = ethers.keccak256(ethers.toUtf8Bytes("owner-1"));
      const h2 = ethers.keccak256(ethers.toUtf8Bytes("owner-2"));
      await contract.publishRecord("CASE-001", [h1, h2]);
      const [hashes] = await contract.getRecord("CASE-001");
      expect(hashes).to.deep.equal([h1, h2]);
    });
    it("reverts on duplicate caseId", async () => {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("doc"));
      await contract.publishRecord("CASE-001", [hash]);
      await expect(contract.publishRecord("CASE-001", [hash])).to.be.revertedWith("Record already exists");
    });
    it("reverts for non-owner", async () => {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("doc"));
      await expect(contract.connect(nonOwner).publishRecord("CASE-001", [hash])).to.be.revertedWith("Not authorised");
    });
    it("reverts for an empty hash list", async () => {
      await expect(contract.publishRecord("CASE-001", [])).to.be.revertedWith("Invalid hash");
    });
    it("reverts when any hash is zero", async () => {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("doc"));
      await expect(contract.publishRecord("CASE-001", [hash, ethers.ZeroHash])).to.be.revertedWith("Invalid hash");
    });
  });

  describe("voidRecord", function () {
    beforeEach(async () => {
      await contract.publishRecord("CASE-001", [ethers.keccak256(ethers.toUtf8Bytes("doc"))]);
    });
    it("emits RecordVoided on success", async () => {
      await expect(contract.voidRecord("CASE-001", "Legal")).to.emit(contract, "RecordVoided");
    });
    it("reverts with empty reason", async () => {
      await expect(contract.voidRecord("CASE-001", "")).to.be.revertedWith("Reason required");
    });
    it("reverts on double void", async () => {
      await contract.voidRecord("CASE-001", "First");
      await expect(contract.voidRecord("CASE-001", "Second")).to.be.revertedWith("Record already voided");
    });
    it("reverts on non-existent record", async () => {
      await expect(contract.voidRecord("CASE-999", "Reason")).to.be.revertedWith("Record does not exist");
    });
  });

  describe("getRecord", function () {
    it("reflects voided state correctly", async () => {
      await contract.publishRecord("CASE-001", [ethers.keccak256(ethers.toUtf8Bytes("doc"))]);
      await contract.voidRecord("CASE-001", "Dispute");
      const [, , voided, reason] = await contract.getRecord("CASE-001");
      expect(voided).to.equal(true);
      expect(reason).to.equal("Dispute");
    });
  });
});