import { Request, Response } from "express";
import * as compensationService from "../services/compensation-report.service";

export async function getAllReports(req: Request, res: Response): Promise<void> {
  try {
    const { status, search, page, limit } = req.query;
    const result = await compensationService.getAllReports({
      status: status as string,
      search: search as string,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
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
  const { caseId, valuationReportId, components, remarks, createdById } = req.body;

  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  if (!valuationReportId) {
    res.status(400).json({ error: "valuationReportId is required" });
    return;
  }
  if (!components) {
    res.status(400).json({ error: "compensation components are required" });
    return;
  }

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
