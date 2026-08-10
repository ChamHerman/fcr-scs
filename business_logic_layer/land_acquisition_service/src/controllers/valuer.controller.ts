import { Request, Response } from "express";
import * as valuerService from "../services/valuer.service";

export async function getAvailableValuers(_req: Request, res: Response): Promise<void> {
  try {
    const valuers = await valuerService.getAvailableValuers();
    res.json({ valuers });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}
