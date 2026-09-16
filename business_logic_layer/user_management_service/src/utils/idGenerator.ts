import { prisma } from '../prisma';

export const TABLE_PREFIXES = {
  user: 'USR',
  userSession: 'SES',
  rolePermission: 'RPM',
  passwordReset: 'PWR',
  accountActivation: 'ACT',
  auditLog: 'AUD',
  systemAlert: 'ALT',
  alertRule: 'ARL',
  emailTemplate: 'EMT',
  processDeadline: 'PDL',
  systemMetric: 'SMT',
  complianceBackupLog: 'CBL',
} as const;

export const MODEL_PK_MAP: Record<UserModuleModel, string> = {
  user: 'userId',
  userSession: 'sessionId',
  rolePermission: 'id',
  passwordReset: 'resetId',
  accountActivation: 'activationId',
  auditLog: 'logId',
  systemAlert: 'alertId',
  alertRule: 'ruleId',
  emailTemplate: 'templateId',
  processDeadline: 'deadlineId',
  systemMetric: 'metricId',
  complianceBackupLog: 'logId',
};

export type UserModuleModel = keyof typeof TABLE_PREFIXES;

/**
 * Generates an array of contiguous formatted custom IDs in the format ???-YYYY-MM-XXXX
 * e.g. ["USR-2026-09-0001", "USR-2026-09-0002"]
 */
export async function generateCustomIds(
  modelName: UserModuleModel,
  count: number,
  tx?: any
): Promise<string[]> {
  const client = tx || prisma;
  const prefix = TABLE_PREFIXES[modelName];
  const pkField = MODEL_PK_MAP[modelName];
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const monthPrefix = `${prefix}-${year}-${month}-`;

  const lastRecord = await (client[modelName] as any).findFirst({
    where: {
      [pkField]: {
        startsWith: monthPrefix,
      },
    },
    orderBy: {
      [pkField]: 'desc',
    },
    select: {
      [pkField]: true,
    },
  });

  let nextSeq = 1;
  const currentVal = lastRecord?.[pkField];
  if (currentVal && typeof currentVal === 'string') {
    const parts = currentVal.split('-');
    const lastSeqNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeqNum)) {
      nextSeq = lastSeqNum + 1;
    }
  }

  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    ids.push(`${monthPrefix}${String(nextSeq + i).padStart(4, '0')}`);
  }
  return ids;
}

/**
 * Generates a formatted custom ID in the format ???-YYYY-MM-XXXX
 * e.g. USR-2026-09-0001, AUD-2026-09-0001, ALT-2026-09-0001
 * 
 * @param modelName - The Prisma model name in the User Management / System Admin module
 * @param tx - Optional Prisma transaction client
 * @returns Formatted ID string (e.g. "USR-2026-09-0001")
 */
export async function generateCustomId(
  modelName: UserModuleModel,
  tx?: any
): Promise<string> {
  const [id] = await generateCustomIds(modelName, 1, tx);
  return id;
}
