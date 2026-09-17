import { Request, Response } from "express";
import * as predictionService from "../services/pythonBridge.service";
import type { ValuationInput } from "../interfaces/prediction.types";
import { logAudit } from "../../../user_management_service/src/services/audit.service";
import { AuthenticatedRequest } from "../../../user_management_service/src/middleware/auth.middleware";

export async function valuate(req: Request, res: Response): Promise<void> {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    res.status(400).json({ error: "A JSON object with the property attributes is required" });
    return;
  }

  try {
    // The body is forwarded as-is: the Python sidecar normalises canonical and
    // legacy (pre-alignment) keys/aliases and returns precise validation errors.
    const breakdown = await predictionService.valuate(req.body as unknown as ValuationInput);

    const user = (req as AuthenticatedRequest).user;
    logAudit({
      userId: user?.userId,
      activityType: 'AI_VALUATION_GENERATED',
      moduleName: 'AI_VALUATION',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: {
        inputKeys: Object.keys(req.body),
        estimatedValue: (breakdown as any)?.totalCompensation ?? (breakdown as any)?.estimatedValue,
      },
      systemResponse: 'SUCCESS (200)',
    });

    res.json({ success: true, data: breakdown });
  } catch (e: unknown) {
    handleError(res, e);
  }
}

export async function getModelInfo(_req: Request, res: Response): Promise<void> {
  try {
    const info = await predictionService.getModelInfo();
    res.json({ success: true, data: info });
  } catch (e: unknown) {
    handleError(res, e, { notFoundStatus: true });
  }
}

export async function retrainModel(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: "Multipart field 'dataset' with a .csv file is required" });
    return;
  }
  if (!req.file.originalname.toLowerCase().endsWith(".csv")) {
    res.status(400).json({ error: "Only .csv datasets are accepted" });
    return;
  }

  const user = (req as AuthenticatedRequest).user;
  try {
    const comparison = await predictionService.retrainModel(req.file.buffer, req.file.originalname);

    logAudit({
      userId: user?.userId,
      activityType: 'AI_MODEL_RETRAINED',
      moduleName: 'AI_VALUATION',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: {
        datasetFileName: req.file.originalname,
        datasetSizeBytes: req.file.size,
        comparison,
      },
      systemResponse: 'SUCCESS (200)',
    });

    res.json({ success: true, data: comparison });
  } catch (e: unknown) {
    logAudit({
      userId: user?.userId,
      activityType: 'AI_MODEL_RETRAIN_FAILED',
      moduleName: 'AI_VALUATION',
      severity: 'CRITICAL',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: {
        datasetFileName: req.file.originalname,
        error: (e as Error).message,
      },
      systemResponse: 'ERROR (500/502)',
    });
    handleError(res, e);
  }
}

export async function activateModel(req: Request, res: Response): Promise<void> {
  const candidateId = req.body?.candidateId;
  if (!candidateId) {
    res.status(400).json({ error: "candidateId is required" });
    return;
  }
  const user = (req as AuthenticatedRequest).user;
  try {
    const info = await predictionService.activateModel(candidateId);

    logAudit({
      userId: user?.userId,
      activityType: 'AI_MODEL_ACTIVATED',
      moduleName: 'AI_VALUATION',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: { candidateId, modelInfo: info },
      systemResponse: 'SUCCESS (200)',
    });

    res.json({ success: true, data: info });
  } catch (e: unknown) {
    handleError(res, e, { notFoundStatus: true });
  }
}

export async function discardModel(req: Request, res: Response): Promise<void> {
  const candidateId = req.body?.candidateId;
  if (!candidateId) {
    res.status(400).json({ error: "candidateId is required" });
    return;
  }
  const user = (req as AuthenticatedRequest).user;
  try {
    await predictionService.discardCandidate(candidateId);

    logAudit({
      userId: user?.userId,
      activityType: 'AI_MODEL_DISCARDED',
      moduleName: 'AI_VALUATION',
      severity: 'INFO',
      ipAddress: req.ip || '127.0.0.1',
      deviceInfo: (req.headers['user-agent'] as string) || 'Unknown',
      activityDetails: { candidateId },
      systemResponse: 'SUCCESS (200)',
    });

    res.json({ success: true, data: { discarded: candidateId } });
  } catch (e: unknown) {
    handleError(res, e, { notFoundStatus: true });
  }
}

export async function getDatasetTemplate(_req: Request, res: Response): Promise<void> {
  try {
    const { buffer, filename } = await predictionService.downloadDatasetTemplate();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e: unknown) {
    handleError(res, e);
  }
}

function handleError(res: Response, e: unknown, opts?: { notFoundStatus?: boolean }): void {
  const msg = (e as Error).message;
  if (opts?.notFoundStatus && msg.toLowerCase().includes("not found")) {
    res.status(404).json({ error: msg });
  } else if (msg.includes("unavailable")) {
    res.status(502).json({ error: msg });
  } else if (msg.toLowerCase().includes("required") || msg.toLowerCase().includes("must be") || msg.toLowerCase().includes("missing")) {
    res.status(400).json({ error: msg });
  } else {
    res.status(500).json({ error: msg });
  }
}
