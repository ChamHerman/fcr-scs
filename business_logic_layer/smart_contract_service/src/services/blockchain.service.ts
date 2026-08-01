import { PrismaClient } from "@prisma/client";
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

export async function publishRecord(caseId: string, documentHash: string) {
  if (await prisma.blockchainRecord.findUnique({ where: { caseId } }))
    throw new Error("Record already published for this case");
  const { transactionHash } = await ethereum.publishToBlockchain(caseId, documentHash);
  return prisma.blockchainRecord.create({ data: { caseId, documentHash, transactionHash, status: "Published" } });
}

export async function voidRecord(caseId: string, voidReason: string) {
  const r = await prisma.blockchainRecord.findUnique({ where: { caseId } });
  if (!r) throw new Error("Record not found");
  if (r.status === "Voided") throw new Error("Record already voided");
  const { transactionHash } = await ethereum.voidOnBlockchain(caseId, voidReason);
  return prisma.blockchainRecord.update({
    where: { caseId },
    data: { status: "Voided", voidReason, voidTransactionHash: transactionHash, voidedAt: new Date() },
  });
}

export async function getRecords(status?: string) {
  return prisma.blockchainRecord.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" } });
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
