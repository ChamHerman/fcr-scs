import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { logAudit } from '../services/audit.service';

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const { search, module: moduleName, severity, startDate, endDate, isArchived } = req.query;

    const where: any = {};

    // Filter by archive state (default to active logs only)
    if (isArchived !== undefined && isArchived !== 'ALL') {
      where.isArchived = isArchived === 'true';
    } else if (isArchived === undefined) {
      where.isArchived = false;
    }

    // Filter by module
    if (moduleName && moduleName !== 'ALL') {
      where.moduleName = moduleName as string;
    }

    // Filter by severity
    if (severity && severity !== 'ALL') {
      where.severity = severity as string;
    }

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    // Text search filter
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { logId: { contains: q, mode: 'insensitive' } },
        { activityType: { contains: q, mode: 'insensitive' } },
        { userRole: { contains: q, mode: 'insensitive' } },
        { caseReference: { contains: q, mode: 'insensitive' } },
        { ipAddress: { contains: q, mode: 'insensitive' } },
        { activityDetails: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    // Parallel execution for data and count pushdown
    const [totalCount, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              email: true,
              role: true,
              isActive: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    res.json({
      logs,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        pageSize: limit,
      },
    });
  } catch (error) {
    console.error('[AuditController] Error retrieving audit logs:', error);
    res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
}

export async function getAuditStats(_req: Request, res: Response): Promise<void> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalLogs, activeLogs, archivedLogs, todayLogs, infoCount, warningCount, criticalCount, securityCount] =
      await Promise.all([
        prisma.auditLog.count(),
        prisma.auditLog.count({ where: { isArchived: false } }),
        prisma.auditLog.count({ where: { isArchived: true } }),
        prisma.auditLog.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.auditLog.count({ where: { severity: 'INFO' } }),
        prisma.auditLog.count({ where: { severity: 'WARNING' } }),
        prisma.auditLog.count({ where: { severity: 'CRITICAL' } }),
        prisma.auditLog.count({ where: { severity: 'SECURITY' } }),
      ]);

    res.json({
      totalLogs,
      activeLogs,
      archivedLogs,
      todayLogs,
      bySeverity: {
        INFO: infoCount,
        WARNING: warningCount,
        CRITICAL: criticalCount,
        SECURITY: securityCount,
      },
    });
  } catch (error) {
    console.error('[AuditController] Error retrieving audit stats:', error);
    res.status(500).json({ error: 'Failed to retrieve audit statistics' });
  }
}

export async function exportAuditLogsCsv(req: Request, res: Response): Promise<void> {
  try {
    const { search, module: moduleName, severity, startDate, endDate, isArchived } = req.query;

    const where: any = {};
    if (isArchived !== undefined && isArchived !== 'ALL') {
      where.isArchived = isArchived === 'true';
    }
    if (moduleName && moduleName !== 'ALL') {
      where.moduleName = moduleName as string;
    }
    if (severity && severity !== 'ALL') {
      where.severity = severity as string;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
    }
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { logId: { contains: q, mode: 'insensitive' } },
        { activityType: { contains: q, mode: 'insensitive' } },
        { userRole: { contains: q, mode: 'insensitive' } },
        { caseReference: { contains: q, mode: 'insensitive' } },
        { ipAddress: { contains: q, mode: 'insensitive' } },
        { activityDetails: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      take: 5000, // Export safety cap
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const formatMytDate = (date: Date) => {
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const parts = formatter.formatToParts(date);
      const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';
      return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
    };

    const headers = [
      'Log ID',
      'Timestamp (MYT)',
      'Severity',
      'Module',
      'Activity Type',
      'User Name',
      'User Email',
      'Role',
      'Case Reference',
      'IP Address',
      'System Response',
      'Activity Details',
    ];

    const rows = logs.map((log) => {
      let actorName = log.user?.name || '';
      let actorEmail = log.user?.email || '';

      if ((!actorName || !actorEmail) && log.activityDetails) {
        try {
          const parsed = JSON.parse(log.activityDetails);
          if (!actorName && parsed.actorName) actorName = parsed.actorName;
          if (!actorEmail && parsed.actorEmail) actorEmail = parsed.actorEmail;
        } catch {
          // ignore parsing error
        }
      }

      return [
        escapeCsv(log.logId),
        escapeCsv(formatMytDate(log.createdAt)),
        escapeCsv(log.severity),
        escapeCsv(log.moduleName),
        escapeCsv(log.activityType),
        escapeCsv(actorName || 'N/A'),
        escapeCsv(actorEmail || 'N/A'),
        escapeCsv(log.userRole || 'N/A'),
        escapeCsv(log.caseReference || 'N/A'),
        escapeCsv(log.ipAddress),
        escapeCsv(log.systemResponse || 'SUCCESS'),
        escapeCsv(log.activityDetails || ''),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${timestamp}.csv"`);

    logAudit({
      userRole: 'SYSTEM_ADMINISTRATOR',
      activityType: 'AUDIT_LOGS_EXPORTED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: { exportedRows: rows.length, filename: `audit_logs_${timestamp}.csv` },
      systemResponse: 'SUCCESS (200)',
    });

    res.status(200).send(csvContent);
  } catch (error) {
    console.error('[AuditController] Error exporting audit logs to CSV:', error);
    res.status(500).json({ error: 'Failed to export audit logs to CSV' });
  }
}

export async function archiveOldLogs(req: Request, res: Response): Promise<void> {
  try {
    const days = parseInt(req.body.olderThanDays, 10) || 180;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await prisma.auditLog.updateMany({
      where: {
        createdAt: { lt: cutoffDate },
        isArchived: false,
      },
      data: {
        isArchived: true,
      },
    });

    logAudit({
      userRole: 'SYSTEM_ADMINISTRATOR',
      activityType: 'AUDIT_LOGS_ARCHIVED',
      moduleName: 'USER_MANAGEMENT',
      severity: 'WARNING',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: { archivedCount: result.count, olderThanDays: days },
      systemResponse: 'SUCCESS (200)',
    });

    res.json({
      message: `Successfully archived ${result.count} logs older than ${days} days`,
      archivedCount: result.count,
    });
  } catch (error) {
    console.error('[AuditController] Error archiving logs:', error);
    res.status(500).json({ error: 'Failed to archive audit logs' });
  }
}

export async function recordClientAuditLog(req: Request, res: Response): Promise<void> {
  try {
    const { activityType, moduleName, severity, caseReference, activityDetails, systemResponse } = req.body;
    if (!activityType) {
      res.status(400).json({ success: false, error: 'activityType is required' });
      return;
    }

    const authHeader = req.headers.authorization;
    let userId: string | null = null;
    let userRole: string | null = null;
    let actorName: string | null = null;
    let actorEmail: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '').trim();
      if (token) {
        const session = await prisma.userSession.findUnique({
          where: { sessionToken: token },
          include: { user: true },
        });
        if (session?.user) {
          userId = session.user.userId;
          userRole = session.user.role;
          actorName = session.user.name;
          actorEmail = session.user.email;
        }
      }
    }

    // Fallback if client passed user info in activityDetails
    if (!userId && activityDetails?.userId) userId = activityDetails.userId;
    if (!userRole && activityDetails?.userRole) userRole = activityDetails.userRole;
    if (!actorName && activityDetails?.userName) actorName = activityDetails.userName;
    if (!actorEmail && activityDetails?.email) actorEmail = activityDetails.email;

    logAudit({
      userId,
      userRole,
      actorName,
      actorEmail,
      activityType,
      moduleName: moduleName || 'ACCESS_CONTROL',
      severity: severity || 'SECURITY',
      caseReference: caseReference || null,
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: activityDetails || {},
      systemResponse: systemResponse || 'ACCESS_DENIED (403)',
    });

    res.json({ success: true, message: 'Audit event recorded' });
  } catch (error) {
    console.error('[recordClientAuditLog Error]', error);
    res.status(500).json({ success: false, error: 'Internal server error recording audit event' });
  }
}
