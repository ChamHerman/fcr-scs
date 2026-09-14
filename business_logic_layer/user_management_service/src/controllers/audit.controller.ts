import { Request, Response } from 'express';
import { prisma } from '../prisma';

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

    const headers = [
      'Log ID',
      'Timestamp (UTC)',
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
        escapeCsv(log.createdAt.toISOString()),
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

    res.json({
      message: `Successfully archived ${result.count} logs older than ${days} days`,
      archivedCount: result.count,
    });
  } catch (error) {
    console.error('[AuditController] Error archiving logs:', error);
    res.status(500).json({ error: 'Failed to archive audit logs' });
  }
}
