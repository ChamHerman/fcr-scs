import { Request, Response } from "express";
import * as assignmentService from "../services/assignment.service";

export async function assignValuer(req: Request, res: Response): Promise<void> {
  const { caseId, valuerId, acceptancePeriodDays, remarks, assignedById } = req.body;

  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  if (!valuerId) {
    res.status(400).json({ error: "valuerId is required" });
    return;
  }

  const userId = assignedById || "00000000-0000-0000-0000-000000000001";

  try {
    const assignment = await assignmentService.assignValuer({
      caseId,
      valuerId,
      acceptancePeriodDays: acceptancePeriodDays ? parseInt(acceptancePeriodDays, 10) : 7,
      remarks,
      assignedById: userId,
    });
    res.status(201).json({ assignment });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function getAllAssignments(_req: Request, res: Response): Promise<void> {
  try {
    const assignments = await assignmentService.getAllAssignments();
    res.json({ assignments });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}
