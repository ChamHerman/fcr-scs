import { Request, Response } from "express";
import * as caseService from "../services/case.service";
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

// ─── WRITE Handlers (Phase 2) ────────────────────────────────────────────────

export async function createCase(req: Request, res: Response): Promise<void> {
  const { project, land, owners, caseTitle, remarks, createdById } = req.body;

  if (!project) {
    res.status(400).json({ error: "project details are required" });
    return;
  }
  if (!land) {
    res.status(400).json({ error: "land details are required" });
    return;
  }
  if (!owners || !Array.isArray(owners) || owners.length === 0) {
    res.status(400).json({ error: "At least one land owner is required" });
    return;
  }
  if (!caseTitle) {
    res.status(400).json({ error: "caseTitle is required" });
    return;
  }

  if (!project.projectName || !project.projectType || !project.purpose || !project.fundingSource) {
    res.status(400).json({ error: "Project name, type, purpose, and funding source are required" });
    return;
  }
  if (project.budget === undefined || project.budget <= 0) {
    res.status(400).json({ error: "Project budget must be a positive number" });
    return;
  }

  if (!land.landTitleNo || !land.lotNo || !land.mukim || !land.district || !land.state) {
    res.status(400).json({ error: "Land title number, lot number, mukim, district, and state are required" });
    return;
  }
  if (land.area === undefined || land.area <= 0) {
    res.status(400).json({ error: "Land area must be a positive number" });
    return;
  }
  if (land.latitude === undefined || land.longitude === undefined) {
    res.status(400).json({ error: "GPS coordinates (latitude and longitude) are required" });
    return;
  }

  for (let i = 0; i < owners.length; i++) {
    const owner = owners[i];
    if (!owner.name || !owner.nric || !owner.address || !owner.contact) {
      res.status(400).json({ error: `Owner #${i + 1}: name, nric, address, and contact are required` });
      return;
    }
  }

  const userId = createdById || "00000000-0000-0000-0000-000000000001";

  try {
    const result = await caseService.createCase({
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
  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }

  const { caseTitle, remarks, status } = req.body;

  try {
    const result = await caseService.updateCase(caseId, {
      caseTitle,
      remarks,
      status,
    });
    res.json({ case: result });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
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
