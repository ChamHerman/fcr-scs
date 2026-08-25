import { Request, Response } from "express";
import * as objectionService from "../services/objection.service";

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
  if (!objectionId) {
    res.status(400).json({ error: "objectionId is required" });
    return;
  }

  try {
    const objection = await objectionService.getObjectionById(objectionId);
    res.json({ objection });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(500).json({ error: msg });
    }
  }
}

export async function createObjection(req: Request, res: Response): Promise<void> {
  const { offerId, caseId, objectionReason, requestedAmount, createdById } = req.body;

  if (!offerId || !caseId || !objectionReason) {
    res.status(400).json({ error: "offerId, caseId, and objectionReason are required" });
    return;
  }
  if (requestedAmount === undefined || requestedAmount <= 0) {
    res.status(400).json({ error: "requestedAmount must be a positive number" });
    return;
  }

  const userId = createdById || "00000000-0000-0000-0000-000000000001";

  try {
    const objection = await objectionService.createObjection({
      offerId,
      caseId,
      objectionReason,
      requestedAmount: parseFloat(requestedAmount),
      createdById: userId,
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
    const objection = await objectionService.reviewObjection({
      objectionId,
      decision: revisedCompensation ? "REVISED" : "ACCEPTED",
      revisedCompensation: revisedCompensation ? parseFloat(revisedCompensation) : undefined,
      reviewRemarks: reviewRemarks || "Objection approved.",
      reviewedById: reviewedById || undefined,
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

