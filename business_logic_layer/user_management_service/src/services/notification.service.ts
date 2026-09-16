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
 * Resolves case-specific stakeholders for targeted alert notification
 */
async function resolveCaseStakeholders(
  caseReference: string,
  targetRole: UserRole
): Promise<Array<{ userId: string; name: string; email: string; role: UserRole }>> {
  try {
    if (targetRole === UserRole.DISPLACED_COMMUNITY_MEMBER) {
      const acqCase = await prisma.acquisitionCase.findUnique({
        where: { caseId: caseReference },
        include: {
          landParcel: {
            include: {
              ownerships: {
                include: {
                  landOwner: true,
                },
              },
            },
          },
          paymentCase: {
            include: {
              beneficiary: true,
            },
          },
        },
      });

      if (!acqCase) return [];

      const nrics = new Set<string>();
      const emails = new Set<string>();

      if (acqCase.paymentCase?.beneficiary) {
        if (acqCase.paymentCase.beneficiary.nric) nrics.add(acqCase.paymentCase.beneficiary.nric.trim());
        if (acqCase.paymentCase.beneficiary.email) emails.add(acqCase.paymentCase.beneficiary.email.trim());
      }

      acqCase.landParcel?.ownerships?.forEach((os) => {
        if (os.landOwner?.nric) nrics.add(os.landOwner.nric.trim());
        if (os.landOwner?.email) emails.add(os.landOwner.email.trim());
      });

      if (nrics.size === 0 && emails.size === 0) return [];

      return await prisma.user.findMany({
        where: {
          role: UserRole.DISPLACED_COMMUNITY_MEMBER,
          isActive: true,
          deletedAt: null,
          OR: [
            ...(nrics.size > 0 ? [{ identificationNumber: { in: Array.from(nrics) } }] : []),
            ...(emails.size > 0 ? [{ email: { in: Array.from(emails) } }] : []),
          ],
        },
        select: { userId: true, name: true, email: true, role: true },
      });
    }

    if (targetRole === UserRole.LAND_VALUER) {
      const assignments = await prisma.caseAssignment.findMany({
        where: {
          caseId: caseReference,
          assignedTo: {
            role: UserRole.LAND_VALUER,
          },
        },
        include: {
          assignedTo: {
            select: { userId: true, name: true, email: true, role: true, isActive: true, deletedAt: true },
          },
        },
      });

      const assignedValuers = assignments
        .map((a) => a.assignedTo)
        .filter((u) => u && u.isActive && !u.deletedAt) as Array<{ userId: string; name: string; email: string; role: UserRole }>;

      if (assignedValuers.length > 0) return assignedValuers;

      const report = await prisma.valuationReport.findFirst({
        where: { caseId: caseReference },
        include: {
          valuer: {
            select: { userId: true, name: true, email: true, role: true, isActive: true, deletedAt: true },
          },
        },
      });

      if (report?.valuer && report.valuer.isActive && !report.valuer.deletedAt) {
        return [report.valuer];
      }
      return [];
    }

    if (targetRole === UserRole.GOVERNMENT_OFFICER) {
      const assignments = await prisma.caseAssignment.findMany({
        where: {
          caseId: caseReference,
          assignedTo: {
            role: UserRole.GOVERNMENT_OFFICER,
          },
        },
        include: {
          assignedTo: {
            select: { userId: true, name: true, email: true, role: true, isActive: true, deletedAt: true },
          },
        },
      });

      const assignedOfficers = assignments
        .map((a) => a.assignedTo)
        .filter((u) => u && u.isActive && !u.deletedAt) as Array<{ userId: string; name: string; email: string; role: UserRole }>;

      if (assignedOfficers.length > 0) return assignedOfficers;

      const acqCase = await prisma.acquisitionCase.findUnique({
        where: { caseId: caseReference },
        include: {
          createdBy: {
            select: { userId: true, name: true, email: true, role: true, isActive: true, deletedAt: true },
          },
        },
      });

      if (acqCase?.createdBy && acqCase.createdBy.role === UserRole.GOVERNMENT_OFFICER && acqCase.createdBy.isActive && !acqCase.createdBy.deletedAt) {
        return [acqCase.createdBy];
      }
      return [];
    }

    return [];
  } catch (err) {
    console.error(`[NotificationService] Error resolving case stakeholders for ${caseReference}:`, err);
    return [];
  }
}

/**
 * Loads additional case metadata for email template variable interpolation
 */
async function loadCaseMetadata(caseReference: string) {
  try {
    const acqCase = await prisma.acquisitionCase.findUnique({
      where: { caseId: caseReference },
      include: {
        landParcel: true,
        paymentCase: true,
      },
    });
    if (!acqCase) return null;

    const formattedAmount = acqCase.paymentCase?.amount
      ? `RM ${Number(acqCase.paymentCase.amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : 'N/A';

    return {
      caseTitle: acqCase.caseTitle || 'N/A',
      lotNo: acqCase.landParcel?.lotNo || 'N/A',
      mukim: acqCase.landParcel?.mukim || 'N/A',
      amount: formattedAmount,
      status: acqCase.status || 'N/A',
      remarks: acqCase.remarks || 'N/A',
    };
  } catch {
    return null;
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
        const role = rule.targetRole as UserRole;

        // If this event has a case reference and targets case-involved roles, resolve the specific involved party!
        if (
          auditLog.caseReference &&
          (role === UserRole.DISPLACED_COMMUNITY_MEMBER ||
            role === UserRole.LAND_VALUER ||
            role === UserRole.GOVERNMENT_OFFICER)
        ) {
          const caseStakeholders = await resolveCaseStakeholders(auditLog.caseReference, role);
          if (caseStakeholders.length > 0) {
            recipients = caseStakeholders;
            console.log(
              `[NotificationService] Resolved ${caseStakeholders.length} case-specific ${role} recipient(s) for case ${auditLog.caseReference}`
            );
          }
        }

        // If no case-specific stakeholder was matched (or event is system-wide), broadcast to active role members
        if (!recipients.length) {
          recipients = await prisma.user.findMany({
            where: {
              role,
              isActive: true,
              deletedAt: null,
            },
            select: { userId: true, name: true, email: true, role: true },
          });
        }
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
        const caseMetadata = auditLog.caseReference ? await loadCaseMetadata(auditLog.caseReference) : null;

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
              caseTitle: caseMetadata?.caseTitle || 'N/A',
              lotNo: caseMetadata?.lotNo || 'N/A',
              mukim: caseMetadata?.mukim || 'N/A',
              amount: caseMetadata?.amount || 'N/A',
              compensationAmount: caseMetadata?.amount || 'N/A',
              actionUrl: auditLog.caseReference
                ? (recipient.role === UserRole.DISPLACED_COMMUNITY_MEMBER
                    ? `http://localhost:5173/member`
                    : `http://localhost:5173/admin/case-management`)
                : 'http://localhost:5173/admin',
              buttonText: 'View Case In Portal',
              portalLink: recipient.role === UserRole.DISPLACED_COMMUNITY_MEMBER
                ? 'http://localhost:5173/member'
                : 'http://localhost:5173/admin',
              status: caseMetadata?.status || 'N/A',
              remarks: caseMetadata?.remarks || 'N/A',
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
