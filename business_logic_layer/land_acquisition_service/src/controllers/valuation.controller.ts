import { Request, Response } from "express";
import * as valuationService from "../services/valuation.service";

export async function getAllReports(req: Request, res: Response): Promise<void> {
  try {
    const { status, search, page, limit } = req.query;
    const result = await valuationService.getAllReports({
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
    const report = await valuationService.getReportById(reportId);
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
  const { caseId, valuerId, valuationMethod, marketValue, recommendedCompensation, remarks, createdById } = req.body;

  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  if (!valuationMethod) {
    res.status(400).json({ error: "valuationMethod is required" });
    return;
  }
  if (marketValue === undefined || marketValue <= 0) {
    res.status(400).json({ error: "marketValue must be a positive number" });
    return;
  }
  if (recommendedCompensation === undefined || recommendedCompensation <= 0) {
    res.status(400).json({ error: "recommendedCompensation must be a positive number" });
    return;
  }

  const userId = createdById || "00000000-0000-0000-0000-000000000001";

  try {
    const report = await valuationService.createOrUpdateReport({
      caseId,
      valuerId,
      valuationMethod,
      marketValue: parseFloat(marketValue),
      recommendedCompensation: parseFloat(recommendedCompensation),
      remarks: remarks || "",
      createdById: userId,
    });
    res.status(201).json({ report });
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
  const { reviewerId } = req.body;

  if (!reportId) {
    res.status(400).json({ error: "reportId is required" });
    return;
  }

  try {
    const report = await valuationService.approveReport(reportId, reviewerId);
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
  const { reason, acceptancePeriodDays, reviewerId } = req.body;

  if (!reportId) {
    res.status(400).json({ error: "reportId is required" });
    return;
  }
  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    res.status(400).json({ error: "Rejection reason is required" });
    return;
  }

  try {
    const report = await valuationService.rejectReport(reportId, reason, acceptancePeriodDays, reviewerId);
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
