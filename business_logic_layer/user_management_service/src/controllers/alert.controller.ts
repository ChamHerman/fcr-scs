import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AlertUrgency, AlertChannel, UserRole } from '@prisma/client';
import { logAudit } from '../services/audit.service';
import { sendTemplatedEmail } from '../utils/email.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { generateCustomId } from '../utils/idGenerator';

/**
 * GET /api/alerts
 * Pushdown filtering, search, and pagination for System Alerts
 */
export async function getAlerts(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
    const status = (req.query.status as string) || 'all';
    const urgency = req.query.urgency as AlertUrgency | undefined;
    const search = (req.query.search as string)?.trim();
    const user = (req as AuthenticatedRequest).user;

    const where: any = {};

    // Filter by acknowledgment status
    if (status === 'unacknowledged') {
      where.isAcknowledged = false;
    } else if (status === 'acknowledged') {
      where.isAcknowledged = true;
    }

    // Filter by urgency
    if (urgency && Object.values(AlertUrgency).includes(urgency)) {
      where.urgencyLevel = urgency;
    }

    // Search filter across message or alertType
    if (search) {
      where.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { alertType: { contains: search, mode: 'insensitive' } },
        { caseReference: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Role-based scoping: Non-system admins only see alerts specifically targeted to them
    if (user && user.role !== UserRole.SYSTEM_ADMINISTRATOR && user.role !== UserRole.GOVERNMENT_ADMINISTRATOR) {
      where.recipientId = user.userId;
    }

    const [totalCount, alerts] = await Promise.all([
      prisma.systemAlert.count({ where }),
      prisma.systemAlert.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          recipient: {
            select: {
              userId: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    res.json({
      alerts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount,
        pageSize: limit,
      },
    });
  } catch (error) {
    console.error('[AlertController] Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to retrieve system alerts' });
  }
}

/**
 * GET /api/alerts/stats
 * Summary metrics for alerts dashboard
 */
export async function getAlertStats(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    const baseWhere: any = {};

    if (user && user.role !== UserRole.SYSTEM_ADMINISTRATOR && user.role !== UserRole.GOVERNMENT_ADMINISTRATOR) {
      baseWhere.recipientId = user.userId;
    }

    const [totalAlerts, unacknowledgedCount, criticalCount, acknowledgedCount, activeRulesCount] = await Promise.all([
      prisma.systemAlert.count({ where: baseWhere }),
      prisma.systemAlert.count({ where: { ...baseWhere, isAcknowledged: false } }),
      prisma.systemAlert.count({
        where: {
          ...baseWhere,
          isAcknowledged: false,
          urgencyLevel: { in: [AlertUrgency.CRITICAL, AlertUrgency.HIGH] },
        },
      }),
      prisma.systemAlert.count({ where: { ...baseWhere, isAcknowledged: true } }),
      user?.role === UserRole.SYSTEM_ADMINISTRATOR
        ? prisma.alertRule.count({ where: { isEnabled: true } })
        : Promise.resolve(0),
    ]);

    res.json({
      totalAlerts,
      unacknowledgedAlerts: unacknowledgedCount,
      criticalAlerts: criticalCount,
      acknowledgedAlerts: acknowledgedCount,
      activeRules: activeRulesCount,
    });
  } catch (error) {
    console.error('[AlertController] Error fetching alert stats:', error);
    res.status(500).json({ error: 'Failed to retrieve alert statistics' });
  }
}

/**
 * PATCH /api/alerts/:alertId/acknowledge
 * Mark a single alert as acknowledged
 */
export async function acknowledgeAlert(req: Request, res: Response): Promise<void> {
  try {
    const alertId = req.params.alertId as string;
    const user = (req as AuthenticatedRequest).user;

    const existing = await prisma.systemAlert.findUnique({
      where: { alertId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    const updated = await prisma.systemAlert.update({
      where: { alertId },
      data: {
        isAcknowledged: true,
        acknowledgedAt: new Date(),
      },
      include: {
        recipient: {
          select: {
            userId: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    logAudit({
      userId: user?.userId || null,
      userRole: user?.role || 'SYSTEM_ADMINISTRATOR',
      activityType: 'ALERT_ACKNOWLEDGED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      actorName: user?.name,
      actorEmail: user?.email,
      activityDetails: {
        alertId,
        alertType: existing.alertType,
        urgencyLevel: existing.urgencyLevel,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('[AlertController] Error acknowledging alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
}

/**
 * POST /api/alerts/acknowledge-all
 * Mark all unacknowledged alerts as acknowledged
 */
export async function acknowledgeAllAlerts(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    const where: any = { isAcknowledged: false };

    if (user && user.role !== UserRole.SYSTEM_ADMINISTRATOR && user.role !== UserRole.GOVERNMENT_ADMINISTRATOR) {
      where.recipientId = user.userId;
    }

    const result = await prisma.systemAlert.updateMany({
      where,
      data: {
        isAcknowledged: true,
        acknowledgedAt: new Date(),
      },
    });

    logAudit({
      userId: user?.userId || null,
      userRole: user?.role || 'SYSTEM_ADMINISTRATOR',
      activityType: 'ALERTS_BULK_ACKNOWLEDGED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      actorName: user?.name,
      actorEmail: user?.email,
      activityDetails: {
        acknowledgedCount: result.count,
      },
    });

    res.json({
      message: 'All unacknowledged alerts have been acknowledged',
      count: result.count,
    });
  } catch (error) {
    console.error('[AlertController] Error bulk acknowledging alerts:', error);
    res.status(500).json({ error: 'Failed to acknowledge all alerts' });
  }
}

// ==========================================
// NOTIFICATION & ROUTING RULES CRUD
// ==========================================

/**
 * GET /api/alerts/rules
 * Fetch all configured alert routing rules
 */
export async function getAlertRules(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (user?.role !== UserRole.SYSTEM_ADMINISTRATOR) {
      res.status(403).json({ error: 'Access denied: Only System Administrators can view notification routing rules.' });
      return;
    }

    const rules = await prisma.alertRule.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            userId: true,
            name: true,
            email: true,
          },
        },
        targetUser: {
          select: {
            userId: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.json(rules);
  } catch (error) {
    console.error('[AlertController] Error fetching alert rules:', error);
    res.status(500).json({ error: 'Failed to retrieve notification rules' });
  }
}

/**
 * POST /api/alerts/rules
 * Create a new notification & alert routing rule
 */
export async function createAlertRule(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    if (user?.role !== UserRole.SYSTEM_ADMINISTRATOR) {
      res.status(403).json({ error: 'Access denied: Only System Administrators can configure notification routing rules.' });
      return;
    }
    const {
      ruleName,
      description,
      activityType,
      moduleName,
      minSeverity,
      triggerInApp,
      triggerEmail,
      urgencyLevel,
      emailTemplateName,
      targetRole,
      targetUserId,
      isEnabled,
    } = req.body;

    if (!ruleName || !ruleName.trim()) {
      res.status(400).json({ error: 'Rule name is required' });
      return;
    }

    const ruleId = await generateCustomId('alertRule');
    const newRule = await prisma.alertRule.create({
      data: {
        ruleId,
        ruleName: ruleName.trim(),
        description: description?.trim() || null,
        activityType: activityType?.trim() || '*',
        moduleName: moduleName?.trim() || '*',
        minSeverity: minSeverity || 'INFO',
        triggerInApp: triggerInApp ?? true,
        triggerEmail: triggerEmail ?? false,
        urgencyLevel: (urgencyLevel as AlertUrgency) || AlertUrgency.MEDIUM,
        emailTemplateName: emailTemplateName?.trim() || null,
        targetRole: targetRole?.trim() || null,
        targetUserId: targetUserId || null,
        isEnabled: isEnabled ?? true,
        createdById: user?.userId || null,
      },
      include: {
        createdBy: {
          select: {
            userId: true,
            name: true,
            email: true,
          },
        },
        targetUser: {
          select: {
            userId: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    logAudit({
      userId: user?.userId || null,
      userRole: user?.role || 'SYSTEM_ADMINISTRATOR',
      activityType: 'ALERT_RULE_CREATED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      actorName: user?.name,
      actorEmail: user?.email,
      activityDetails: {
        ruleId: newRule.ruleId,
        ruleName: newRule.ruleName,
        activityType: newRule.activityType,
        triggerInApp: newRule.triggerInApp,
        triggerEmail: newRule.triggerEmail,
        targetRole: newRule.targetRole,
      },
    });

    res.status(201).json(newRule);
  } catch (error) {
    console.error('[AlertController] Error creating alert rule:', error);
    res.status(500).json({ error: 'Failed to create notification rule' });
  }
}

/**
 * PUT /api/alerts/rules/:ruleId
 * Update an existing notification routing rule or toggle its status
 */
export async function updateAlertRule(req: Request, res: Response): Promise<void> {
  try {
    const ruleId = req.params.ruleId as string;
    const user = (req as AuthenticatedRequest).user;
    if (user?.role !== UserRole.SYSTEM_ADMINISTRATOR) {
      res.status(403).json({ error: 'Access denied: Only System Administrators can modify notification routing rules.' });
      return;
    }
    const {
      ruleName,
      description,
      activityType,
      moduleName,
      minSeverity,
      triggerInApp,
      triggerEmail,
      urgencyLevel,
      emailTemplateName,
      targetRole,
      targetUserId,
      isEnabled,
    } = req.body;

    const existing = await prisma.alertRule.findUnique({
      where: { ruleId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Notification rule not found' });
      return;
    }

    const updated = await prisma.alertRule.update({
      where: { ruleId },
      data: {
        ruleName: ruleName !== undefined ? ruleName.trim() : undefined,
        description: description !== undefined ? description?.trim() || null : undefined,
        activityType: activityType !== undefined ? activityType.trim() : undefined,
        moduleName: moduleName !== undefined ? moduleName.trim() : undefined,
        minSeverity: minSeverity !== undefined ? minSeverity : undefined,
        triggerInApp: triggerInApp !== undefined ? triggerInApp : undefined,
        triggerEmail: triggerEmail !== undefined ? triggerEmail : undefined,
        urgencyLevel: urgencyLevel !== undefined ? (urgencyLevel as AlertUrgency) : undefined,
        emailTemplateName: emailTemplateName !== undefined ? emailTemplateName?.trim() || null : undefined,
        targetRole: targetRole !== undefined ? targetRole?.trim() || null : undefined,
        targetUserId: targetUserId !== undefined ? targetUserId || null : undefined,
        isEnabled: isEnabled !== undefined ? isEnabled : undefined,
      },
      include: {
        createdBy: {
          select: {
            userId: true,
            name: true,
            email: true,
          },
        },
        targetUser: {
          select: {
            userId: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    logAudit({
      userId: user?.userId || null,
      userRole: user?.role || 'SYSTEM_ADMINISTRATOR',
      activityType: 'ALERT_RULE_UPDATED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      actorName: user?.name,
      actorEmail: user?.email,
      activityDetails: {
        ruleId: updated.ruleId,
        ruleName: updated.ruleName,
        isEnabled: updated.isEnabled,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('[AlertController] Error updating alert rule:', error);
    res.status(500).json({ error: 'Failed to update notification rule' });
  }
}

/**
 * DELETE /api/alerts/rules/:ruleId
 * Remove a notification routing rule
 */
export async function deleteAlertRule(req: Request, res: Response): Promise<void> {
  try {
    const ruleId = req.params.ruleId as string;
    const user = (req as AuthenticatedRequest).user;
    if (user?.role !== UserRole.SYSTEM_ADMINISTRATOR) {
      res.status(403).json({ error: 'Access denied: Only System Administrators can delete notification routing rules.' });
      return;
    }

    const existing = await prisma.alertRule.findUnique({
      where: { ruleId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Notification rule not found' });
      return;
    }

    await prisma.alertRule.delete({
      where: { ruleId },
    });

    logAudit({
      userId: user?.userId || null,
      userRole: user?.role || 'SYSTEM_ADMINISTRATOR',
      activityType: 'ALERT_RULE_DELETED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'WARNING',
      ipAddress: req.ip || '127.0.0.1',
      actorName: user?.name,
      actorEmail: user?.email,
      activityDetails: {
        ruleId,
        ruleName: existing.ruleName,
      },
    });

    res.json({ message: 'Notification rule deleted successfully', ruleId });
  } catch (error) {
    console.error('[AlertController] Error deleting alert rule:', error);
    res.status(500).json({ error: 'Failed to delete notification rule' });
  }
}

/**
 * POST /api/alerts/rules/:ruleId/test
 * Simulate triggering a rule to immediately verify in-app and email delivery
 */
export async function testTriggerRule(req: Request, res: Response): Promise<void> {
  try {
    const ruleId = req.params.ruleId as string;
    const user = (req as AuthenticatedRequest).user;
    if (user?.role !== UserRole.SYSTEM_ADMINISTRATOR) {
      res.status(403).json({ error: 'Access denied: Only System Administrators can test notification routing rules.' });
      return;
    }

    const rule = await prisma.alertRule.findUnique({
      where: { ruleId },
    });

    if (!rule) {
      res.status(404).json({ error: 'Notification rule not found' });
      return;
    }

    // Determine target recipient for testing (authenticated admin or target user)
    const targetUserId = rule.targetUserId || user?.userId;
    const targetUser = targetUserId
      ? await prisma.user.findUnique({ where: { userId: targetUserId } })
      : null;

    const testRecipient = targetUser || user;

    if (!testRecipient) {
      res.status(400).json({ error: 'No recipient available to test notification' });
      return;
    }

    const simulatedMessage = `[TEST SIMULATION] Rule '${rule.ruleName}' triggered for activity '${rule.activityType}'. Tested by ${user?.name || 'Administrator'}.`;

    let inAppCreated = null;
    if (rule.triggerInApp) {
      const alertId = await generateCustomId('systemAlert');
      inAppCreated = await prisma.systemAlert.create({
        data: {
          alertId,
          recipientId: testRecipient.userId,
          alertType: rule.activityType === '*' ? 'SYSTEM_TEST_ALERT' : rule.activityType,
          channel: AlertChannel.IN_APP,
          urgencyLevel: rule.urgencyLevel,
          message: simulatedMessage,
          isAcknowledged: false,
        },
      });
    }

    let emailSent = false;
    if (rule.triggerEmail) {
      try {
        await sendTemplatedEmail(testRecipient.email, rule.emailTemplateName || 'SYSTEM_ALERT', {
          name: testRecipient.name,
          alertType: rule.activityType,
          message: simulatedMessage,
          severity: rule.minSeverity,
          ruleName: rule.ruleName,
          ipAddress: req.ip || '127.0.0.1',
          timestamp: new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' }),
          caseId: 'TEST-CASE-001',
          caseReference: 'TEST-CASE-001',
        });
        emailSent = true;
      } catch (emailErr) {
        console.warn('[AlertController] Test email delivery failed:', emailErr);
      }
    }

    res.json({
      success: true,
      message: `Test alert dispatched for rule '${rule.ruleName}'`,
      inAppCreated: !!inAppCreated,
      emailSent,
      recipientEmail: testRecipient.email,
    });
  } catch (error) {
    console.error('[AlertController] Error testing alert rule:', error);
    res.status(500).json({ error: 'Failed to execute test notification' });
  }
}
