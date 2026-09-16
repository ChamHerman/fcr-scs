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
 * Format a human-readable, non-technical summary from an audit log for in-app alert feeds
 */
function buildAlertMessage(auditLog: AuditLog): string {
  let details: any = {};
  if (auditLog.activityDetails) {
    try {
      details = typeof auditLog.activityDetails === 'string'
        ? JSON.parse(auditLog.activityDetails)
        : auditLog.activityDetails;
    } catch {
      details = { raw: auditLog.activityDetails };
    }
  }

  if (details.message) return details.message;

  const caseRef = auditLog.caseReference || details.caseId || '';
  const caseSuffix = caseRef ? ` for case ${caseRef}` : '';

  switch (auditLog.activityType) {
    case 'CASE_CREATED':
      return `A new land acquisition case '${details.caseTitle || caseRef || 'Record'}' has been registered in the system${caseRef ? ` (${caseRef})` : ''}.`;
    case 'CASE_UPDATED':
      return `Acquisition case ${caseRef || 'details'} has been updated${details.status ? ` (Status: ${details.status})` : ''}.`;
    case 'CASE_DELETED':
      return `Acquisition case ${caseRef || ''} has been removed from the registry.`;
    case 'VALUER_ASSIGNED':
      return `A certified land valuer has been assigned${caseSuffix}${details.acceptancePeriodDays ? ` with a ${details.acceptancePeriodDays}-day acceptance window` : ''}.`;
    case 'VALUATION_REPORT_CREATED':
      return `A valuation assessment report has been submitted${caseSuffix}${details.recommendedCompensation ? ` with recommended compensation of RM ${Number(details.recommendedCompensation).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : ''}.`;
    case 'VALUATION_REPORT_APPROVED':
      return `The valuation report${caseSuffix} has been approved by the reviewing officer.`;
    case 'VALUATION_REPORT_REJECTED':
      return `The valuation report${caseSuffix} was returned for revision${details.reason ? `: ${details.reason}` : ''}.`;
    case 'COMPENSATION_REPORT_CREATED':
      return `Statutory compensation report has been prepared${caseSuffix}${details.totalCompensation ? ` totalling RM ${Number(details.totalCompensation).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : ''}.`;
    case 'COMPENSATION_REPORT_APPROVED':
      return `The compensation award assessment${caseSuffix} has been approved.`;
    case 'COMPENSATION_REPORT_REJECTED':
      return `The compensation award assessment${caseSuffix} was rejected${details.reason ? `: ${details.reason}` : ''}.`;
    case 'OFFER_LETTER_CREATED':
      return `Official Form H Notice of Award and Offer of Compensation has been issued${caseSuffix}${details.offerAmount ? ` for RM ${Number(details.offerAmount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : ''}.`;
    case 'OFFER_LETTER_ACCEPTED':
      return `The statutory compensation offer${caseSuffix} has been accepted by the landowner.`;
    case 'OFFER_LETTER_REJECTED':
      return `The statutory compensation offer${caseSuffix} was declined by the landowner${details.remarks ? `: ${details.remarks}` : ''}.`;
    case 'OBJECTION_FILED':
      return `A Form N statutory objection has been lodged${caseSuffix}${details.requestedAmount ? ` claiming RM ${Number(details.requestedAmount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : ''}${details.reason ? ` (${details.reason})` : ''}.`;
    case 'OBJECTION_REVIEWED':
      return `The Form N objection${caseSuffix} has been reviewed (${details.decision || 'DECIDED'})${details.reviewRemarks ? `: ${details.reviewRemarks}` : ''}.`;
    case 'OBJECTION_WITHDRAWN':
      return `The objection${caseSuffix} has been withdrawn or archived.`;
    case 'ADMIN_USER_PROVISIONED':
      return `New account provisioned: ${details.createdUser || details.provisionedUserName || ''} (${details.targetEmail || details.provisionedUserEmail || ''}) as ${details.targetRole || details.assignedRole || ''}.`;
    case 'CITIZEN_AUTO_PROVISIONED':
      return `Landowner account automatically provisioned for ${details.name || 'Citizen'} (${details.email || ''}) upon case attachment.`;
    case 'ROLE_PERMISSIONS_UPDATED':
      return `Permissions updated for role ${details.targetRole || ''}: ${details.pagePath || ''} (${details.canAccess ? 'Granted' : 'Revoked'}).`;
    case 'USER_STATUS_CHANGE':
      return `Account status changed to ${details.status || 'UPDATED'} for user ${details.targetUserEmail || ''}.`;
    case 'EMAIL_TEMPLATE_MODIFIED':
      return `Statutory email template '${details.templateName || ''}' was updated.`;
    case 'SECURITY_ALERT_BRUTE_FORCE_THROTTLED':
      return `Security alert: Multiple failed authentication attempts throttled from IP ${auditLog.ipAddress || 'unknown'}.`;
    case 'USER_PASSWORD_RESET_REQUESTED':
      return `Password reset requested for account ${details.email || ''}.`;
    case 'USER_PASSWORD_RESET_COMPLETED':
      return `Password reset completed for account ${details.email || ''}.`;
    case 'USER_PASSWORD_UPDATED':
      return `Account password was updated for ${details.email || ''}.`;
    default:
      if (details.reason) return `${auditLog.activityType}: ${details.reason}`;
      const actionName = auditLog.activityType
        .split('_')
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' ');
      return `${actionName} recorded in ${auditLog.moduleName.replace(/_/g, ' ')}${caseSuffix}.`;
  }
}

/**
 * Resolves case-specific stakeholders for targeted alert notification
 */
async function resolveCaseStakeholders(
  caseReference: string,
  targetRole: UserRole,
  activityDetails?: any
): Promise<Array<{ userId: string; name: string; email: string; role: UserRole }>> {
  try {
    if (targetRole === UserRole.DISPLACED_COMMUNITY_MEMBER) {
      // If activity details explicitly identifies a user
      if (activityDetails?.userId) {
        const directMember = await prisma.user.findFirst({
          where: { userId: activityDetails.userId, role: UserRole.DISPLACED_COMMUNITY_MEMBER, isActive: true, deletedAt: null },
          select: { userId: true, name: true, email: true, role: true },
        });
        if (directMember) return [directMember];
      }

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
          objections: {
            include: {
              createdBy: {
                select: { userId: true, name: true, email: true, role: true, isActive: true, deletedAt: true },
              },
            },
          },
        },
      });

      if (!acqCase) return [];

      const nrics = new Set<string>();
      const emails = new Set<string>();

      if (acqCase.paymentCase?.beneficiary) {
        const rawNric = acqCase.paymentCase.beneficiary.nric || '';
        const clean = rawNric.replace(/\D/g, '');
        if (clean) nrics.add(clean);
        if (rawNric) nrics.add(rawNric.trim());
        if (acqCase.paymentCase.beneficiary.email) emails.add(acqCase.paymentCase.beneficiary.email.trim().toLowerCase());
      }

      acqCase.landParcel?.ownerships?.forEach((os) => {
        const rawNric = os.landOwner?.nric || '';
        const clean = rawNric.replace(/\D/g, '');
        if (clean) nrics.add(clean);
        if (rawNric) nrics.add(rawNric.trim());
        if (os.landOwner?.email) emails.add(os.landOwner.email.trim().toLowerCase());
      });

      // Also check landowners who submitted objections for this case
      const objectionSubmitters = acqCase.objections
        ?.map((obj) => obj.createdBy)
        .filter((u) => u && u.isActive && !u.deletedAt && u.role === UserRole.DISPLACED_COMMUNITY_MEMBER) as Array<{ userId: string; name: string; email: string; role: UserRole }>;

      if (nrics.size === 0 && emails.size === 0 && (!objectionSubmitters || objectionSubmitters.length === 0)) {
        return [];
      }

      const matchedUsers = await prisma.user.findMany({
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

      const combinedMap = new Map<string, { userId: string; name: string; email: string; role: UserRole }>();
      matchedUsers.forEach((u) => combinedMap.set(u.userId, u));
      if (objectionSubmitters) {
        objectionSubmitters.forEach((u) => combinedMap.set(u.userId, u));
      }

      return Array.from(combinedMap.values());
    }

    if (targetRole === UserRole.LAND_VALUER) {
      if (activityDetails?.valuerId) {
        const directValuer = await prisma.user.findFirst({
          where: { userId: activityDetails.valuerId, role: UserRole.LAND_VALUER, isActive: true, deletedAt: null },
          select: { userId: true, name: true, email: true, role: true },
        });
        if (directValuer) return [directValuer];
      }

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
      if (activityDetails?.officerId) {
        const directOfficer = await prisma.user.findFirst({
          where: { userId: activityDetails.officerId, role: UserRole.GOVERNMENT_OFFICER, isActive: true, deletedAt: null },
          select: { userId: true, name: true, email: true, role: true },
        });
        if (directOfficer) return [directOfficer];
      }

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
        compensationReports: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!acqCase) return null;

    let totalAmount: any = acqCase.paymentCase?.amount;
    if (!totalAmount && acqCase.compensationReports?.length > 0) {
      totalAmount = acqCase.compensationReports[0].totalCompensation;
    }

    const formattedAmount = totalAmount
      ? `RM ${Number(totalAmount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

    let activityDetailsObj: any = {};
    if (auditLog.activityDetails) {
      try {
        activityDetailsObj = JSON.parse(auditLog.activityDetails);
      } catch {
        activityDetailsObj = {};
      }
    }

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
      } else if (rule.targetRole) {
        const rawRoles = rule.targetRole.split(',').map((r) => r.trim()).filter(Boolean);
        const recipientMap = new Map<string, { userId: string; name: string; email: string; role: UserRole }>();

        for (const rawRole of rawRoles) {
          if (rawRole === 'ALL_ADMINS') {
            const admins = await prisma.user.findMany({
              where: {
                role: { in: [UserRole.SYSTEM_ADMINISTRATOR, UserRole.GOVERNMENT_ADMINISTRATOR] },
                isActive: true,
                deletedAt: null,
              },
              select: { userId: true, name: true, email: true, role: true },
            });
            admins.forEach((u) => recipientMap.set(u.userId, u));
            continue;
          }

          const role = rawRole as UserRole;
          let roleRecipients: Array<{ userId: string; name: string; email: string; role: UserRole }> = [];

          // If this event has a case reference and targets case-involved roles, resolve the specific involved party!
          if (
            auditLog.caseReference &&
            (role === UserRole.DISPLACED_COMMUNITY_MEMBER ||
              role === UserRole.LAND_VALUER ||
              role === UserRole.GOVERNMENT_OFFICER)
          ) {
            const caseStakeholders = await resolveCaseStakeholders(auditLog.caseReference, role, activityDetailsObj);
            if (caseStakeholders.length > 0) {
              roleRecipients = caseStakeholders;
              console.log(
                `[NotificationService] Resolved ${caseStakeholders.length} case-specific ${role} recipient(s) for case ${auditLog.caseReference}`
              );
            }
          }

          // If no case-specific stakeholder was matched (or event is system-wide), broadcast to active role members
          if (!roleRecipients.length) {
            roleRecipients = await prisma.user.findMany({
              where: {
                role,
                isActive: true,
                deletedAt: null,
              },
              select: { userId: true, name: true, email: true, role: true },
            });
          }

          roleRecipients.forEach((u) => recipientMap.set(u.userId, u));
        }

        recipients = Array.from(recipientMap.values());
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
