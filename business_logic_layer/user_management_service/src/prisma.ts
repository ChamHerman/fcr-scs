import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  if (process.env.ALLOW_DEV_DB_FALLBACK === "true") {
    console.warn(
      "[WARN] [user_management_service/prisma] DATABASE_URL is missing. Using dev fallback database URL because ALLOW_DEV_DB_FALLBACK=true is set."
    );
    process.env.DATABASE_URL = "postgresql://fcr_app:postgres@127.0.0.1:5432/fcr_scs_db?schema=public";
  } else if (process.env.NODE_ENV !== "test") {
    throw new Error("DATABASE_URL environment variable is missing in user_management_service/prisma");
  }
}

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
