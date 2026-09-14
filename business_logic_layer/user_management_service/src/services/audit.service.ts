import { EventEmitter } from 'events';
import { prisma } from '../prisma';

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'SECURITY';

export interface AuditLogEvent {
  userId?: string | null;
  userRole?: string | null;
  activityType: string;
  moduleName: string;
  severity?: AuditSeverity;
  caseReference?: string | null;
  ipAddress?: string;
  deviceInfo?: string | null;
  activityDetails?: any;
  systemResponse?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
}

// Global Event Emitter for Asynchronous, Non-Blocking Audit Logging
export const auditEmitter = new EventEmitter();

// Keys to censor from audit detail objects
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'newPassword',
  'oldPassword',
  'confirmPassword',
  'otp',
  'token',
  'secret',
  'accessToken',
  'refreshToken',
  'privateKey',
  'bankCardNumber',
]);

/**
 * Recursively sanitizes data to remove passwords and secrets
 */
function sanitizeDetails(data: any): any {
  if (!data) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(sanitizeDetails);
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase()) || key.toLowerCase().includes('password')) {
      cleaned[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = sanitizeDetails(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Persists an audit log event into the PostgreSQL database.
 */
export async function recordAuditLog(event: AuditLogEvent) {
  try {
    const severity = event.severity || 'INFO';
    let ipAddress = event.ipAddress || '127.0.0.1';
    if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
      ipAddress = '127.0.0.1';
    }

    // Prepare structured activity details with immutable identity snapshot
    let detailsObj: any = {};
    if (typeof event.activityDetails === 'object' && event.activityDetails !== null) {
      detailsObj = sanitizeDetails(event.activityDetails);
    } else if (typeof event.activityDetails === 'string') {
      try {
        detailsObj = sanitizeDetails(JSON.parse(event.activityDetails));
      } catch {
        detailsObj = { message: event.activityDetails };
      }
    }

    // Preserve snapshot of actor's name/email in the details so hard-deletions never leave blanks
    if (event.actorName && !detailsObj.actorName) {
      detailsObj.actorName = event.actorName;
    }
    if (event.actorEmail && !detailsObj.actorEmail) {
      detailsObj.actorEmail = event.actorEmail;
    }

    let serializedDetails = JSON.stringify(detailsObj);
    // Limit string length to 5000 chars to protect storage
    if (serializedDetails.length > 5000) {
      serializedDetails = serializedDetails.substring(0, 4950) + '... [TRUNCATED]';
    }

    const created = await prisma.auditLog.create({
      data: {
        userId: event.userId || null,
        userRole: event.userRole || null,
        activityType: event.activityType,
        moduleName: event.moduleName,
        severity,
        caseReference: event.caseReference || null,
        ipAddress,
        deviceInfo: event.deviceInfo || null,
        activityDetails: serializedDetails,
        systemResponse: event.systemResponse || 'SUCCESS (200)',
      },
    });

    if (severity === 'SECURITY') {
      console.warn(`[SECURITY ALERT] [AuditService] ${event.activityType} by ${event.actorEmail || event.userId || 'Anonymous'} from IP ${ipAddress}`);
    }

    return created;
  } catch (error) {
    console.error('[AuditService] Error writing audit log:', error);
    return null;
  }
}

// Background Listener for Event Emitter
auditEmitter.on('audit:log', async (event: AuditLogEvent) => {
  await recordAuditLog(event);
});

/**
 * Asynchronous, non-blocking helper to emit audit events
 */
export function logAudit(event: AuditLogEvent): void {
  // Fire and forget onto the Node.js event bus
  setImmediate(() => {
    auditEmitter.emit('audit:log', event);
  });
}
