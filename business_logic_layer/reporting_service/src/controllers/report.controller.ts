import { Request, Response } from "express";
import {
  getDashboardOverviewStats,
  generateCaseStatusData,
  generatePaymentData,
  generateBlockchainAuditData,
  ReportFilterParams,
} from "../services/report.service";
import { generatePdfBuffer } from "../services/pdf.service";
import { logAudit } from "../../../user_management_service/src/services/audit.service";
import { AuthenticatedRequest } from "../../../user_management_service/src/middleware/auth.middleware";
import { prisma } from "../../../user_management_service/src/prisma";

export const getOverviewStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await getDashboardOverviewStats();
    res.json(stats);
  } catch (error: any) {
    console.error("[ERROR] [reporting_service] getOverviewStats failed:", error);
    res.status(500).json({ error: error.message || "Failed to fetch reporting overview stats" });
  }
};

const resolveOperator = async (req: Request, defaultRole: 'officer' | 'admin'): Promise<string> => {
  if (req.query.operator && typeof req.query.operator === 'string' && req.query.operator.trim()) {
    return req.query.operator.trim();
  }
  let user = (req as AuthenticatedRequest).user;
  if (!user && req.headers.authorization) {
    try {
      const authHeader = req.headers.authorization;
      const sessionToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.split(' ')[1];
      if (sessionToken) {
        const session = await prisma.userSession.findUnique({
          where: { sessionToken },
          include: { user: true },
        });
        if (session && session.user && session.expiresAt > new Date()) {
          user = session.user;
        }
      }
    } catch {
      // Ignore
    }
  }
  if (user?.name) {
    const roleTitle = user.role === 'GOVERNMENT_OFFICER'
      ? 'Government Officer'
      : (user.role === 'GOVERNMENT_ADMINISTRATOR' ? 'Government Administrator' : 'System Administrator');
    return `${user.name} (${roleTitle})`;
  }
  return defaultRole === 'officer'
    ? 'Government Officer (JKPTG)'
    : 'Gov Administrator (Government Administrator)';
};

export const getCaseStatusReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { format, startDate, endDate, state, status, location, projectType, reportId } = req.query;
    const resolvedOperator = await resolveOperator(req, 'officer');
    const filters: ReportFilterParams = {
      startDate: startDate as string,
      endDate: endDate as string,
      state: state as string,
      status: status as string,
      location: location as string,
      projectType: projectType as string,
      operator: resolvedOperator,
      reportId: reportId as string,
    };

    const data = await generateCaseStatusData(filters);
    const user = (req as AuthenticatedRequest).user;

    if (format === "pdf") {
      const pdfBuffer = await generatePdfBuffer("Case Status & Lifecycle Report", data);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${data.reportId}.pdf"`);
      res.setHeader("X-Report-Id", data.reportId);

      logAudit({
        userId: user?.userId,
        activityType: 'REPORT_EXPORTED',
        moduleName: 'REPORTING',
        severity: 'INFO',
        ipAddress: req.ip || '127.0.0.1',
        deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
        activityDetails: { reportType: 'CASE_STATUS', format: 'PDF', filters },
        systemResponse: 'SUCCESS (200)',
      });

      res.send(pdfBuffer);
      return;
    }

    logAudit({
      userId: user?.userId,
      activityType: 'REPORT_GENERATED',
      moduleName: 'REPORTING',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: { reportType: 'CASE_STATUS', format: 'JSON', filters },
      systemResponse: 'SUCCESS (200)',
    });

    res.json(data);
  } catch (error: any) {
    console.error("[ERROR] [reporting_service] getCaseStatusReport failed:", error);
    res.status(500).json({ error: error.message || "Failed to generate case status report" });
  }
};

export const getPaymentReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { format, startDate, endDate, status, reportId } = req.query;
    const resolvedOperator = await resolveOperator(req, 'admin');
    const filters: ReportFilterParams = {
      startDate: startDate as string,
      endDate: endDate as string,
      status: status as string,
      operator: resolvedOperator,
      reportId: reportId as string,
    };

    const data = await generatePaymentData(filters);
    const user = (req as AuthenticatedRequest).user;

    if (format === "pdf") {
      const pdfBuffer = await generatePdfBuffer("Payment & Disbursement Report", data);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${data.reportId}.pdf"`);
      res.setHeader("X-Report-Id", data.reportId);

      logAudit({
        userId: user?.userId,
        activityType: 'REPORT_EXPORTED',
        moduleName: 'REPORTING',
        severity: 'INFO',
        ipAddress: req.ip || '127.0.0.1',
        deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
        activityDetails: { reportType: 'PAYMENT_DISBURSEMENT', format: 'PDF', filters },
        systemResponse: 'SUCCESS (200)',
      });

      res.send(pdfBuffer);
      return;
    }

    logAudit({
      userId: user?.userId,
      activityType: 'REPORT_GENERATED',
      moduleName: 'REPORTING',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: { reportType: 'PAYMENT_DISBURSEMENT', format: 'JSON', filters },
      systemResponse: 'SUCCESS (200)',
    });

    res.json(data);
  } catch (error: any) {
    console.error("[ERROR] [reporting_service] getPaymentReport failed:", error);
    res.status(500).json({ error: error.message || "Failed to generate payment report" });
  }
};

export const getBlockchainAuditReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { format, startDate, endDate, status, reportId } = req.query;
    const resolvedOperator = await resolveOperator(req, 'admin');
    const filters: ReportFilterParams = {
      startDate: startDate as string,
      endDate: endDate as string,
      status: status as string,
      operator: resolvedOperator,
      reportId: reportId as string,
    };

    const data = await generateBlockchainAuditData(filters);
    const user = (req as AuthenticatedRequest).user;

    if (format === "pdf") {
      const pdfBuffer = await generatePdfBuffer("Blockchain Audit & Notarization Report", data);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${data.reportId}.pdf"`);
      res.setHeader("X-Report-Id", data.reportId);

      logAudit({
        userId: user?.userId,
        activityType: 'REPORT_EXPORTED',
        moduleName: 'REPORTING',
        severity: 'INFO',
        ipAddress: req.ip || '127.0.0.1',
        deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
        activityDetails: { reportType: 'BLOCKCHAIN_AUDIT', format: 'PDF', filters },
        systemResponse: 'SUCCESS (200)',
      });

      res.send(pdfBuffer);
      return;
    }

    logAudit({
      userId: user?.userId,
      activityType: 'REPORT_GENERATED',
      moduleName: 'REPORTING',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: { reportType: 'BLOCKCHAIN_AUDIT', format: 'JSON', filters },
      systemResponse: 'SUCCESS (200)',
    });

    res.json(data);
  } catch (error: any) {
    console.error("[ERROR] [reporting_service] getBlockchainAuditReport failed:", error);
    res.status(500).json({ error: error.message || "Failed to generate blockchain audit report" });
  }
};


