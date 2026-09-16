import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as objectionService from "../services/objection.service";
import { validateCreateObjection } from "../validators/compensation.validator";
import { getObjectionStorageDir } from "../utils/storage.utils";
import { logAudit } from "../../../user_management_service/src/services/audit.service";

export async function getAllObjections(req: Request, res: Response): Promise<void> {
  try {
    const { status, search, ownerNric, caseCreatedById, userRole, userId, page, limit } = req.query;
    const result = await objectionService.getAllObjections({
      status: status as string,
      search: search as string,
      ownerNric: ownerNric as string,
      caseCreatedById: caseCreatedById as string,
      userRole: userRole as string,
      userId: userId as string,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    res.json(result);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}

export async function getObjectionById(req: Request, res: Response): Promise<void> {
  const objectionId = req.params.objectionId as string;
  try {
    const objection = await objectionService.getObjectionById(objectionId);
    res.json({ objection });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function createObjection(req: Request, res: Response): Promise<void> {
  const validationError = validateCreateObjection(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const { offerId, caseId, objectionReason, requestedAmount, createdById } = req.body;
  const userId = createdById || "00000000-0000-0000-0000-000000000001";

  // Handle uploaded documents if any
  const reqFiles = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
  const documents: Array<{
    fileName: string;
    filePath: string;
    mimeType: string;
    checksum?: string;
  }> = [];

  if (reqFiles && reqFiles.length > 0) {
    try {
      const storageDir = getObjectionStorageDir(caseId);
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      for (const f of reqFiles) {
        const safeName = `Objection_${Date.now()}_${f.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const targetFilePath = path.join(storageDir, safeName);
        fs.writeFileSync(targetFilePath, f.buffer);
        const checksum = "0x" + crypto.createHash("sha256").update(f.buffer).digest("hex");
        documents.push({
          fileName: f.originalname,
          filePath: `document_storage/objections/${caseId}/${safeName}`,
          mimeType: f.mimetype,
          checksum,
        });
      }
    } catch (err) {
      console.warn("Could not save objection attachment files to disk:", err);
    }
  }

  try {
    const objection = await objectionService.createObjection({
      offerId,
      caseId,
      objectionReason,
      requestedAmount: parseFloat(requestedAmount),
      createdById: userId,
      documents: documents.length > 0 ? documents : undefined,
    });

    logAudit({
      userId: (req as any).user?.userId || userId,
      userRole: (req as any).user?.role || "DISPLACED_COMMUNITY_MEMBER",
      activityType: "OBJECTION_FILED",
      moduleName: "COMPENSATION_MANAGEMENT",
      caseReference: caseId,
      severity: "WARNING",
      ipAddress: req.ip || "127.0.0.1",
      deviceInfo: (req.headers["user-agent"] as string) || "Unknown",
      activityDetails: {
        objectionId: (objection as any)?.objectionId,
        caseId,
        offerId,
        requestedAmount: parseFloat(requestedAmount),
        reason: objectionReason,
      },
      systemResponse: "CREATED (201)",
    });

    res.status(201).json({ objection });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function approveObjection(req: Request, res: Response): Promise<void> {
  const objectionId = req.params.objectionId as string;
  const { revisedCompensation, reviewRemarks, reviewedById } = req.body;

  if (!objectionId) {
    res.status(400).json({ error: "objectionId is required" });
    return;
  }

  try {
    const objection = await objectionService.approveObjection({
      objectionId,
      revisedCompensation: revisedCompensation ? parseFloat(revisedCompensation) : undefined,
      reviewRemarks: reviewRemarks || "Objection approved.",
      reviewedById: reviewedById || undefined,
    });

    logAudit({
      userId: (req as any).user?.userId || reviewedById || undefined,
      userRole: (req as any).user?.role || "GOVERNMENT_ADMINISTRATOR",
      activityType: "OBJECTION_REVIEWED",
      moduleName: "COMPENSATION_MANAGEMENT",
      caseReference: (objection as any)?.caseId || undefined,
      severity: "INFO",
      ipAddress: req.ip || "127.0.0.1",
      deviceInfo: (req.headers["user-agent"] as string) || "Unknown",
      activityDetails: {
        objectionId,
        decision: "APPROVED",
        revisedCompensation,
        reviewRemarks,
      },
      systemResponse: "SUCCESS (200)",
    });

    res.json({ objection });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function rejectObjection(req: Request, res: Response): Promise<void> {
  const objectionId = req.params.objectionId as string;
  const { reviewRemarks, reviewedById } = req.body;

  if (!objectionId) {
    res.status(400).json({ error: "objectionId is required" });
    return;
  }

  try {
    const objection = await objectionService.reviewObjection({
      objectionId,
      decision: "REJECTED",
      reviewRemarks: reviewRemarks || "Objection rejected after review.",
      reviewedById: reviewedById || undefined,
    });

    logAudit({
      userId: (req as any).user?.userId || reviewedById || undefined,
      userRole: (req as any).user?.role || "GOVERNMENT_ADMINISTRATOR",
      activityType: "OBJECTION_REVIEWED",
      moduleName: "COMPENSATION_MANAGEMENT",
      caseReference: (objection as any)?.caseId || undefined,
      severity: "INFO",
      ipAddress: req.ip || "127.0.0.1",
      deviceInfo: (req.headers["user-agent"] as string) || "Unknown",
      activityDetails: {
        objectionId,
        decision: "REJECTED",
        reviewRemarks,
      },
      systemResponse: "SUCCESS (200)",
    });

    res.json({ objection });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function updateObjection(req: Request, res: Response): Promise<void> {
  const objectionId = req.params.objectionId as string;
  const { objectionReason, requestedAmount } = req.body;

  if (!objectionId) {
    res.status(400).json({ error: "objectionId is required" });
    return;
  }

  try {
    const objection = await objectionService.updateObjection({
      objectionId,
      objectionReason,
      requestedAmount: requestedAmount !== undefined ? parseFloat(requestedAmount) : undefined,
    });
    res.json({ objection });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function deleteObjection(req: Request, res: Response): Promise<void> {
  const objectionId = req.params.objectionId as string;

  if (!objectionId) {
    res.status(400).json({ error: "objectionId is required" });
    return;
  }

  try {
    const result = await objectionService.deleteObjection(objectionId);

    logAudit({
      userId: (req as any).user?.userId || undefined,
      userRole: (req as any).user?.role || "DISPLACED_COMMUNITY_MEMBER",
      activityType: "OBJECTION_WITHDRAWN",
      moduleName: "COMPENSATION_MANAGEMENT",
      caseReference: (result as any)?.caseId || undefined,
      severity: "INFO",
      ipAddress: req.ip || "127.0.0.1",
      deviceInfo: (req.headers["user-agent"] as string) || "Unknown",
      activityDetails: { objectionId },
      systemResponse: "SUCCESS (200)",
    });

    res.json(result);
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(500).json({ error: msg });
    }
  }
}

