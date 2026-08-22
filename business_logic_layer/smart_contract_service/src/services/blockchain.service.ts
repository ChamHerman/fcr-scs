import { PrismaClient, BlockchainStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as crypto from "crypto";
import * as ethereum from "./ethereum.service";

if (!process.env.DATABASE_URL) {
  if (process.env.ALLOW_DEV_DB_FALLBACK === "true") {
    console.warn(
      "[WARN] [blockchain.service] DATABASE_URL is missing. Using dev fallback database URL because ALLOW_DEV_DB_FALLBACK=true is set."
    );
    process.env.DATABASE_URL = "postgresql://fcr_app:postgres@127.0.0.1:5432/fcr_scs?schema=public";
  } else if (process.env.NODE_ENV !== "test") {
    throw new Error("DATABASE_URL environment variable is missing in blockchain.service");
  }
}

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Crockford-style alphabet: no I, O, 0, 1 to avoid look-alikes
const SHORT_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Short human-readable ledger record id (FCR-XXXXXXXX), stored as the primary key. */
export function newRecordId(): string {
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += SHORT_ID_ALPHABET[bytes[i] % SHORT_ID_ALPHABET.length];
  }
  return `FCR-${out}`;
}

/**
 * Publish/void transactions are signed by the ADMIN WALLET in MetaMask (the
 * frontend sends them via eth_sendTransaction). The backend never signs: it
 * verifies the supplied transaction hash on the active network (mined,
 * successful, targeted the CompensationLedger contract) and only then records
 * it in the database.
 */
async function assertRecordedOnChain(transactionHash: string) {
  const contractAddress = ethereum.getActiveContractAddress();
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS not set for the active network — cannot verify the transaction");
  }
  const verification = await ethereum.verifyTransactionReceipt(transactionHash);
  if (!verification.found) {
    throw new Error("Transaction receipt not found on the active network — it may not be mined yet");
  }
  if (!verification.success) {
    throw new Error("Transaction reverted on chain — nothing was recorded");
  }
  if (verification.to !== contractAddress.toLowerCase()) {
    throw new Error("Transaction did not target the CompensationLedger contract");
  }
}

export async function publishRecord(params: {
  caseId: string;
  documentHash: string;
  transactionHash: string;
}) {
  const { caseId, documentHash, transactionHash } = params;

  const existing = await prisma.blockchainRecord.findUnique({ where: { caseId } });
  if (existing) {
    // Idempotent: re-submitting the same mined transaction (e.g. after a
    // network blip between on-chain confirmation and this call) returns the
    // stored record instead of failing.
    if (existing.transactionHash?.toLowerCase() === transactionHash.toLowerCase()) {
      return existing;
    }
    throw new Error("Record already published for this case");
  }

  await assertRecordedOnChain(transactionHash);

  return prisma.blockchainRecord.create({
    data: {
      id: newRecordId(),
      caseId,
      documentHash,
      transactionHash,
      status: BlockchainStatus.PUBLISHED,
    },
  });
}

export async function voidRecord(params: {
  caseId: string;
  voidReason: string;
  transactionHash: string;
}) {
  const { caseId, voidReason, transactionHash } = params;

  const r = await prisma.blockchainRecord.findUnique({ where: { caseId } });
  if (!r) throw new Error("Record not found");
  if (r.status === BlockchainStatus.VOIDED) throw new Error("Record already voided");

  await assertRecordedOnChain(transactionHash);

  return prisma.blockchainRecord.update({
    where: { caseId },
    data: {
      status: BlockchainStatus.VOIDED,
      voidReason,
      voidTransactionHash: transactionHash,
      voidedAt: new Date(),
    },
  });
}

export async function getRecords(status?: string) {
  let enumStatus: BlockchainStatus | undefined;
  if (status) {
    const s = status.toUpperCase().replace(/\s+/g, "_");
    if (s in BlockchainStatus) {
      enumStatus = s as BlockchainStatus;
    }
  }
  return prisma.blockchainRecord.findMany({
    where: enumStatus ? { status: enumStatus } : {},
    orderBy: { createdAt: "desc" },
  });
}

export async function getRecord(caseId: string) {
  return prisma.blockchainRecord.findUnique({ where: { caseId } });
}

export async function verifyDocument(fileBuffer: Buffer) {
  const localHash = "0x" + crypto.createHash("sha256").update(fileBuffer).digest("hex");
  const record = await prisma.blockchainRecord.findFirst({ where: { documentHash: localHash } });
  if (!record) return { verified: false, status: "Not Found", message: "Record Not Found. This case has not been published yet." };
  const chain = await ethereum.getRecordFromBlockchain(record.caseId);
  if (chain.isVoided) return {
    verified: false, status: "Voided",
    message: "Warning: This settlement record was legally voided. Reason: " + chain.voidReason,
    voidReason: chain.voidReason, timestamp: chain.publishedAt,
  };
  if (localHash.toLowerCase() !== chain.documentHash.toLowerCase()) return { verified: false, status: "Altered", message: "Verification Failed: Document has been altered" };
  return { verified: true, status: "Authentic", message: "Verification Successful", timestamp: chain.publishedAt };
}
