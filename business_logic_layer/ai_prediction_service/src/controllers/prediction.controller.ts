import { Request, Response } from "express";
import * as predictionService from "../services/pythonBridge.service";
import type { ValuationInput } from "../interfaces/prediction.types";

export async function valuate(req: Request, res: Response): Promise<void> {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    res.status(400).json({ error: "A JSON object with the property attributes is required" });
    return;
  }

  try {
    // The body is forwarded as-is: the Python sidecar normalises canonical and
    // legacy (pre-alignment) keys/aliases and returns precise validation errors.
    const breakdown = await predictionService.valuate(req.body as unknown as ValuationInput);
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

  try {
    const comparison = await predictionService.retrainModel(req.file.buffer, req.file.originalname);
    res.json({ success: true, data: comparison });
  } catch (e: unknown) {
    handleError(res, e);
  }
}

export async function activateModel(req: Request, res: Response): Promise<void> {
  const candidateId = req.body?.candidateId;
  if (!candidateId) {
    res.status(400).json({ error: "candidateId is required" });
    return;
  }
  try {
    const info = await predictionService.activateModel(candidateId);
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
  try {
    await predictionService.discardCandidate(candidateId);
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
