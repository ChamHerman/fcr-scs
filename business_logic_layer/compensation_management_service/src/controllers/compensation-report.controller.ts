import { Request, Response } from "express";
import * as compensationService from "../services/compensation-report.service";
import { validateCreateCompensationReport } from "../validators/compensation.validator";
import { logAudit } from "../../../user_management_service/src/services/audit.service";

export async function getAllReports(req: Request, res: Response): Promise<void> {
  try {
    const { status, search, page, limit, caseCreatedById, userRole, userId } = req.query;
    const result = await compensationService.getAllReports({
      status: status as string,
      search: search as string,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      caseCreatedById: caseCreatedById as string,
      userRole: userRole as string,
      userId: userId as string,
    });
    res.json(result);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}

export async function getReportById(req: Request, res: Response): Promise<void> {
  const reportId = req.params.reportId as string;
  if (!reportId) {
    res.status(400).json({ error: "reportId is required" });
    return;
  }
  try {
    const report = await compensationService.getReportById(reportId);
    res.json({ report });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(500).json({ error: msg });
    }
  }
}

export async function createReport(req: Request, res: Response): Promise<void> {
  const validationError = validateCreateCompensationReport(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const { caseId, valuationReportId, components, remarks, createdById } = req.body;

  const userId = createdById || "00000000-0000-0000-0000-000000000001";

  try {
    const result = await compensationService.createReport({
      caseId,
      valuationReportId,
      components: {
        landValue: parseFloat(components.landValue) || 0,
        buildingValue: parseFloat(components.buildingValue) || 0,
        cropValue: parseFloat(components.cropValue) || 0,
        businessDisruption: parseFloat(components.businessDisruption) || 0,
        disturbanceCompensation: parseFloat(components.disturbanceCompensation) || 0,
        relocationAllowance: parseFloat(components.relocationAllowance) || 0,
        otherEligible: parseFloat(components.otherEligible) || 0,
      },
      remarks,
      createdById: userId,
    });

    logAudit({
      userId: (req as any).user?.userId || userId,
      userRole: (req as any).user?.role || "GOVERNMENT_OFFICER",
      activityType: "COMPENSATION_REPORT_CREATED",
      moduleName: "COMPENSATION_MANAGEMENT",
      caseReference: caseId,
      severity: "INFO",
      ipAddress: req.ip || "127.0.0.1",
      deviceInfo: (req.headers["user-agent"] as string) || "Unknown",
      activityDetails: {
        reportId: (result as any)?.report?.reportId,
        caseId,
        totalCompensation: (result as any)?.report?.totalCompensation,
      },
      systemResponse: "CREATED (201)",
    });

    res.status(201).json(result);
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function approveReport(req: Request, res: Response): Promise<void> {
  const reportId = req.params.reportId as string;
  const { approvedById } = req.body;

  if (!reportId) {
    res.status(400).json({ error: "reportId is required" });
    return;
  }

  const userId = approvedById || "00000000-0000-0000-0000-000000000001";

  try {
    const report = await compensationService.approveReport(reportId, userId);

    logAudit({
      userId: (req as any).user?.userId || userId,
      userRole: (req as any).user?.role || "GOVERNMENT_ADMINISTRATOR",
      activityType: "COMPENSATION_REPORT_APPROVED",
      moduleName: "COMPENSATION_MANAGEMENT",
      caseReference: (report as any)?.caseId || undefined,
      severity: "INFO",
      ipAddress: req.ip || "127.0.0.1",
      deviceInfo: (req.headers["user-agent"] as string) || "Unknown",
      activityDetails: { reportId, caseId: (report as any)?.caseId },
      systemResponse: "SUCCESS (200)",
    });

    res.json({ report });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function rejectReport(req: Request, res: Response): Promise<void> {
  const reportId = req.params.reportId as string;
  const { reason, reviewedById } = req.body;

  if (!reportId) {
    res.status(400).json({ error: "reportId is required" });
    return;
  }

  const userId = reviewedById || "00000000-0000-0000-0000-000000000001";

  try {
    const report = await compensationService.rejectReport(reportId, reason, userId);

    logAudit({
      userId: (req as any).user?.userId || userId,
      userRole: (req as any).user?.role || "GOVERNMENT_ADMINISTRATOR",
      activityType: "COMPENSATION_REPORT_REJECTED",
      moduleName: "COMPENSATION_MANAGEMENT",
      caseReference: (report as any)?.caseId || undefined,
      severity: "WARNING",
      ipAddress: req.ip || "127.0.0.1",
      deviceInfo: (req.headers["user-agent"] as string) || "Unknown",
      activityDetails: { reportId, caseId: (report as any)?.caseId, reason },
      systemResponse: "SUCCESS (200)",
    });

    res.json({ report });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}
