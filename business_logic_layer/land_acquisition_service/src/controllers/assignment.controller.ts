import { Request, Response } from "express";
import * as assignmentService from "../services/assignment.service";
import { logAudit } from "../../../user_management_service/src/services/audit.service";

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

  const userId = assignedById || (req as any).user?.userId || (req.headers["x-user-id"] as string) || undefined;

  try {
    const assignment = await assignmentService.assignValuer({
      caseId,
      valuerId,
      acceptancePeriodDays: acceptancePeriodDays ? parseInt(acceptancePeriodDays, 10) : 7,
      remarks,
      assignedById: userId,
    });

    logAudit({
      userId: (req as any).user?.userId || userId,
      userRole: (req as any).user?.role || "GOVERNMENT_OFFICER",
      activityType: "VALUER_ASSIGNED",
      moduleName: "LAND_ACQUISITION",
      caseReference: caseId,
      severity: "INFO",
      ipAddress: req.ip || "127.0.0.1",
      deviceInfo: (req.headers["user-agent"] as string) || "Unknown",
      activityDetails: {
        caseId,
        valuerId,
        acceptancePeriodDays: acceptancePeriodDays ? parseInt(acceptancePeriodDays, 10) : 7,
        remarks,
      },
      systemResponse: "CREATED (201)",
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
