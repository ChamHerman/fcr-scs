import { Request, Response } from "express";
import * as caseService from "../services/case.service";
import { validateCreateCasePayload } from "../validators/case.validator";
import crypto from "crypto";

// ─── GET Handlers (Phase 1) ──────────────────────────────────────────────────

export async function getAllCases(req: Request, res: Response): Promise<void> {
  try {
    const { search, status, projectType, page, limit } = req.query;
    const result = await caseService.getAllCases({
      search: search as string,
      status: status as string,
      projectType: projectType as string,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    res.json(result);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}

export async function getCaseById(req: Request, res: Response): Promise<void> {
  const caseId = req.params.caseId as string;
  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  try {
    const caseData = await caseService.getCaseById(caseId);
    res.json({ case: caseData });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(500).json({ error: msg });
    }
  }
}

export async function getCaseStats(_req: Request, res: Response): Promise<void> {
  try {
    const stats = await caseService.getCaseStats();
    res.json(stats);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}

export async function getUnassignedCases(_req: Request, res: Response): Promise<void> {
  try {
    const cases = await caseService.getUnassignedCases();
    res.json({ cases });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}

export async function getNextCaseId(_req: Request, res: Response): Promise<void> {
  try {
    const nextCaseId = await caseService.generateNextCaseId();
    res.json({ nextCaseId });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}

// ─── WRITE Handlers (Phase 2) ────────────────────────────────────────────────

export async function createCase(req: Request, res: Response): Promise<void> {
  const validationError = validateCreateCasePayload(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const { caseId, project, land, owners, caseTitle, remarks, createdById } = req.body;
  const userId = createdById || "00000000-0000-0000-0000-000000000001";

  try {
    const result = await caseService.createCase({
      caseId,
      project,
      land,
      owners,
      caseTitle,
      remarks,
      createdById: userId,
    });
    res.status(201).json({ case: result });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.includes("already exists")) {
      res.status(409).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function updateCase(req: Request, res: Response): Promise<void> {
  const caseId = req.params.caseId as string;
  console.log(`[CONTROLLER REACHED] updateCase for caseId: ${caseId}`);
  if (!caseId) {
    res.status(400).json({ success: false, error: "caseId is required" });
    return;
  }

  const { caseTitle, remarks, status, project, land, owners } = req.body;

  try {
    const result = await caseService.updateCase(caseId, {
      caseTitle,
      remarks,
      status,
      project,
      land,
      owners,
    });
    res.json({ success: true, message: "Case updated successfully", case: result, data: result });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ success: false, error: msg });
    } else {
      res.status(400).json({ success: false, error: msg });
    }
  }
}

export async function updateProjectInformation(req: Request, res: Response): Promise<void> {
  const caseId = req.params.caseId as string;
  console.log(`[CONTROLLER REACHED] updateProjectInformation for caseId: ${caseId}`);
  if (!caseId) {
    res.status(400).json({ success: false, error: "caseId is required" });
    return;
  }
  try {
    const projectData = req.body.project || req.body;
    const result = await caseService.updateProjectInformation(caseId, projectData);
    res.json({ success: true, message: "Project information updated successfully", project: result, data: result });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ success: false, error: msg });
    } else {
      res.status(400).json({ success: false, error: msg });
    }
  }
}

export async function updateLandInformation(req: Request, res: Response): Promise<void> {
  const caseId = req.params.caseId as string;
  console.log(`[CONTROLLER REACHED] updateLandInformation for caseId: ${caseId}`);
  if (!caseId) {
    res.status(400).json({ success: false, error: "caseId is required" });
    return;
  }
  try {
    const landData = req.body.land || req.body;
    const result = await caseService.updateLandInformation(caseId, landData);
    res.json({ success: true, message: "Land information updated successfully", land: result, data: result });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ success: false, error: msg });
    } else {
      res.status(400).json({ success: false, error: msg });
    }
  }
}

export async function updateOwnerInformation(req: Request, res: Response): Promise<void> {
  const caseId = req.params.caseId as string;
  console.log(`[CONTROLLER REACHED] updateOwnerInformation for caseId: ${caseId}`);
  if (!caseId) {
    res.status(400).json({ success: false, error: "caseId is required" });
    return;
  }
  try {
    const ownersPayload = Array.isArray(req.body) ? req.body : req.body.owners || [];
    const result = await caseService.updateOwnerInformation(caseId, ownersPayload);
    res.json({ success: true, message: "Owner information updated successfully", owners: result, data: result });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ success: false, error: msg });
    } else {
      res.status(400).json({ success: false, error: msg });
    }
  }
}

export async function deleteCase(req: Request, res: Response): Promise<void> {
  const caseId = req.params.caseId as string;
  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }

  try {
    const result = await caseService.deleteCase(caseId);
    res.json(result);
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

// ─── Document Handlers (Phase 2 - Multer) ─────────────────────────────────────

export async function uploadDocument(req: Request, res: Response): Promise<void> {
  const caseId = req.params.caseId as string;
  const { documentType, createdById } = req.body;

  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const userId = createdById || "00000000-0000-0000-0000-000000000001";
  const file = req.file;

  const checksum = crypto.createHash("sha256").update(file.buffer).digest("hex");

  try {
    const doc = await caseService.addCaseDocument({
      caseId,
      documentType: documentType || "Supporting Document",
      fileName: file.originalname,
      fileSize: file.size,
      filePath: `/uploads/${caseId}/${file.originalname}`,
      mimeType: file.mimetype,
      checksum,
      createdById: userId,
    });
    res.status(201).json({ document: doc });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function deleteDocument(req: Request, res: Response): Promise<void> {
  const documentId = req.params.documentId as string;
  if (!documentId) {
    res.status(400).json({ error: "documentId is required" });
    return;
  }

  try {
    const result = await caseService.deleteCaseDocument(documentId);
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
