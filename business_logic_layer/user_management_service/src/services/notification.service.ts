import { prisma } from '../prisma';
import { AuditLog, AlertUrgency, AlertChannel, UserRole } from '@prisma/client';
import { AuditLogEvent } from './audit.service';
import { sendTemplatedEmail } from '../utils/email.service';
import { generateCustomIds } from '../utils/idGenerator';

const SEVERITY_HIERARCHY: Record<string, number> = {
  INFO: 1,
  WARNING: 2,
  CRITICAL: 3,
  SECURITY: 4,
};

/**
 * Format a human-readable summary from an audit log's activity details
 */
function buildAlertMessage(auditLog: AuditLog): string {
  if (!auditLog.activityDetails) {
    return `${auditLog.activityType} triggered in module ${auditLog.moduleName}`;
  }

  try {
    const details = JSON.parse(auditLog.activityDetails);
    if (details.message) return details.message;
    if (details.reason) return `${auditLog.activityType}: ${details.reason}`;
    if (details.provisionedUserEmail) {
      return `New user provisioned: ${details.provisionedUserName || ''} (${details.provisionedUserEmail}) as ${details.assignedRole || ''}`;
    }
    if (details.targetRole && details.pagePath) {
      return `Permission changed for ${details.targetRole}: ${details.pagePath} (${details.canAccess ? 'Granted' : 'Revoked'})`;
    }
    if (details.status) {
      return `Status changed to ${details.status} for user ${details.targetUserEmail || ''}`;
    }
    if (details.templateName) {
      return `Email template '${details.templateName}' was updated by ${details.actorEmail || 'an administrator'}`;
    }
    return JSON.stringify(details);
  } catch {
    return auditLog.activityDetails;
  }
}

/**
 * Evaluates active AlertRules and dispatches in-app alerts and/or emails
 */
export async function dispatchNotificationsForAudit(
  auditLog: AuditLog,
  _event?: AuditLogEvent
): Promise<void> {
  try {
    // 1. Fetch all active alert rules
    const activeRules = await prisma.alertRule.findMany({
      where: { isEnabled: true },
    });

    if (!activeRules.length) return;

    const logSeverityRank = SEVERITY_HIERARCHY[auditLog.severity] || 1;

    for (const rule of activeRules) {
      // 2. Evaluate activityType match
      const activityMatches = rule.activityType === '*' || rule.activityType === auditLog.activityType;
      if (!activityMatches) continue;

      // 3. Evaluate moduleName match
      const moduleMatches = rule.moduleName === '*' || rule.moduleName === auditLog.moduleName;
      if (!moduleMatches) continue;

      // 4. Evaluate minSeverity match
      if (rule.minSeverity !== '*' && rule.minSeverity !== 'ALL') {
        const ruleSeverityRank = SEVERITY_HIERARCHY[rule.minSeverity] || 1;
        if (logSeverityRank < ruleSeverityRank) continue;
      }

      // 5. Resolve target recipients
      let recipients: Array<{ userId: string; name: string; email: string; role: UserRole }> = [];

      if (rule.targetUserId) {
        const specificUser = await prisma.user.findUnique({
          where: { userId: rule.targetUserId },
          select: { userId: true, name: true, email: true, role: true, isActive: true, deletedAt: true },
        });
        if (specificUser && specificUser.isActive && !specificUser.deletedAt) {
          recipients.push(specificUser);
        }
      } else if (rule.targetRole === 'ALL_ADMINS') {
        recipients = await prisma.user.findMany({
          where: {
            role: { in: [UserRole.SYSTEM_ADMINISTRATOR, UserRole.GOVERNMENT_ADMINISTRATOR] },
            isActive: true,
            deletedAt: null,
          },
          select: { userId: true, name: true, email: true, role: true },
        });
      } else if (rule.targetRole) {
        recipients = await prisma.user.findMany({
          where: {
            role: rule.targetRole as UserRole,
            isActive: true,
            deletedAt: null,
          },
          select: { userId: true, name: true, email: true, role: true },
        });
      } else {
        // Fallback default: all active System Administrators
        recipients = await prisma.user.findMany({
          where: {
            role: UserRole.SYSTEM_ADMINISTRATOR,
            isActive: true,
            deletedAt: null,
          },
          select: { userId: true, name: true, email: true, role: true },
        });
      }

      if (!recipients.length) continue;

      const alertMessage = buildAlertMessage(auditLog);

      // 6. In-App Notification Dispatch
      if (rule.triggerInApp) {
        const alertIds = await generateCustomIds('systemAlert', recipients.length);
        const inAppRecords = recipients.map((r, idx) => ({
          alertId: alertIds[idx],
          recipientId: r.userId,
          alertType: auditLog.activityType,
          channel: AlertChannel.IN_APP,
          urgencyLevel: rule.urgencyLevel,
          caseReference: auditLog.caseReference,
          message: alertMessage,
          isAcknowledged: false,
        }));

        await prisma.systemAlert.createMany({
          data: inAppRecords,
        });

        console.log(
          `[NotificationService] Dispatched ${inAppRecords.length} in-app alerts for rule '${rule.ruleName}' [${rule.urgencyLevel}]`
        );
      }

      // 7. Email Notification Dispatch
      if (rule.triggerEmail) {
        const templateToUse = rule.emailTemplateName || 'SYSTEM_ALERT';

        for (const recipient of recipients) {
          try {
            await sendTemplatedEmail(recipient.email, templateToUse, {
              name: recipient.name,
              alertType: auditLog.activityType,
              message: alertMessage,
              severity: auditLog.severity,
              ruleName: rule.ruleName,
              ipAddress: auditLog.ipAddress,
              timestamp: new Date(auditLog.createdAt).toLocaleString('en-MY', {
                timeZone: 'Asia/Kuala_Lumpur',
                dateStyle: 'medium',
                timeStyle: 'medium',
              }),
              caseId: auditLog.caseReference || 'N/A',
              caseReference: auditLog.caseReference || 'N/A',
            });
          } catch (emailErr) {
            console.warn(
              `[NotificationService] Non-fatal email dispatch failure for ${recipient.email}:`,
              emailErr instanceof Error ? emailErr.message : emailErr
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('[NotificationService] Error in dispatchNotificationsForAudit:', error);
  }
}
