import { prisma } from "../prisma";
import { UserRole } from "@prisma/client";
import crypto from "crypto";

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

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error(`Test user with email ${email} not found in database.`);
  }

  const token = `test-session-${scope}-${role}-${index}-${crypto.randomBytes(8).toString("hex")}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.userSession.create({
    data: {
      sessionId: `SES-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${crypto.randomBytes(4).toString('hex')}`,
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
