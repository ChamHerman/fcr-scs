import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { UserRole } from "@prisma/client";
import crypto from "crypto";

// smart_contract_service builds its own PrismaClient per module (there is no
// shared prisma.ts), so the tests do the same rather than importing one.
const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })) });

/**
 * Mirrors payment_service/src/__tests__/testAuthHelper.ts. Routes under test now
 * sit behind `authenticate`, which resolves a user_session row, so tests need a
 * real token rather than a bare header.
 */
export async function getTestSessionToken(
  role: UserRole,
  index = 1,
  scope = "default"
): Promise<string> {
  const email =
    role === UserRole.SYSTEM_ADMINISTRATOR
      ? "admin@fcrscs.gov.my"
      : role === UserRole.DISPLACED_COMMUNITY_MEMBER
        ? `m${index}@fcrscs.gov.my`
        : `ga${index}@fcrscs.gov.my`;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`Test user with email ${email} not found in database.`);
  }

  const token = `test-session-${scope}-${role}-${index}-${crypto.randomBytes(8).toString("hex")}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.userSession.create({
    data: {
      sessionId: `SES-TEST-${crypto.randomBytes(6).toString("hex")}`,
      userId: user.userId,
      sessionToken: token,
      ipAddress: "127.0.0.1",
      deviceInfo: "Jest Test Runner",
      expiresAt,
    },
  });

  return token;
}

export async function cleanupTestSessions(scope?: string): Promise<void> {
  await prisma.userSession.deleteMany({
    where: {
      sessionToken: {
        startsWith: scope ? `test-session-${scope}-` : "test-session-",
      },
    },
  });
}

/** This helper owns its own pool, so it must close it or Jest leaks a worker. */
export async function closeTestDb(): Promise<void> {
  await prisma.$disconnect();
}

export { prisma };
