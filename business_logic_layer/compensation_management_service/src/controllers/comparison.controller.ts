import { Request, Response } from "express";
import * as comparisonService from "../services/comparison.service";

export async function compareCases(req: Request, res: Response): Promise<void> {
  const { caseIds } = req.body;

  if (!caseIds || !Array.isArray(caseIds) || caseIds.length < 2) {
    res.status(400).json({ error: "caseIds array with at least 2 case IDs is required" });
    return;
  }

  try {
    const comparison = await comparisonService.compareCases(caseIds);
    res.json({ comparison });
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
}
