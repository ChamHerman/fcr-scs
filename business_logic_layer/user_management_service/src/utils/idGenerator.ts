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

export const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Encodes a positive integer into Crockford's Base-32 string with specified padding.
 * 4 characters allows values up to 32^4 - 1 = 1,048,575.
 */
export function toBase32(num: number, padding = 4): string {
  if (num <= 0) return '0'.padStart(padding, '0');
  let result = '';
  let n = num;
  while (n > 0) {
    result = CROCKFORD_BASE32[n % 32] + result;
    n = Math.floor(n / 32);
  }
  return result.padStart(padding, '0');
}

/**
 * Decodes a Crockford Base-32 string into an integer.
 * Gracefully handles uppercase normalization and common character confusions (I/L -> 1, O -> 0).
 */
export function fromBase32(str: string): number {
  if (!str) return NaN;
  const s = str.trim().toUpperCase().replace(/[IL]/g, '1').replace(/O/g, '0');
  let num = 0;
  for (let i = 0; i < s.length; i++) {
    const idx = CROCKFORD_BASE32.indexOf(s[i]);
    if (idx === -1) return NaN;
    num = num * 32 + idx;
  }
  return num;
}

/**
 * Generates an array of contiguous formatted custom IDs in the format ???-YYYY-MM-XXXX
 * e.g. ["USR-2026-09-0001", "USR-2026-09-0002"] or ["AUD-2026-09-0001", "AUD-2026-09-0021"]
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
  const isBase32 = modelName === 'auditLog';

  // Fetch all existing record PKs for the current month to calculate the true numeric maximum,
  // preventing string-comparison errors and collision bugs.
  const existingRecords = await (client[modelName] as any).findMany({
    where: {
      [pkField]: {
        startsWith: monthPrefix,
      },
    },
    select: {
      [pkField]: true,
    },
  });

  let maxSeq = 0;
  for (const record of existingRecords) {
    const val = record?.[pkField];
    if (typeof val === 'string') {
      const parts = val.split('-');
      const seqStr = parts[parts.length - 1];
      const seqNum = isBase32 ? fromBase32(seqStr) : parseInt(seqStr, 10);
      if (!isNaN(seqNum) && seqNum > maxSeq) {
        maxSeq = seqNum;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const formattedSeq = isBase32
      ? toBase32(nextSeq + i, 4)
      : String(nextSeq + i).padStart(4, '0');
    ids.push(`${monthPrefix}${formattedSeq}`);
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
