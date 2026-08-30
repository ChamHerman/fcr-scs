import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { prisma } from "../prisma";
import * as offerService from "../services/offer-letter.service";

function getOfferLetterStorageDir(caseId: string): string {
  const candidate1 = path.resolve(__dirname, "../../../../data_layer/document_storage/offer_letter", caseId);
  const candidate2 = path.resolve(process.cwd(), "data_layer/document_storage/offer_letter", caseId);
  const candidate3 = path.resolve(process.cwd(), "../data_layer/document_storage/offer_letter", caseId);

  if (fs.existsSync(path.dirname(candidate1))) return candidate1;
  if (fs.existsSync(path.dirname(candidate2))) return candidate2;
  if (fs.existsSync(path.dirname(candidate3))) return candidate3;
  return candidate1;
}

export async function getAllOfferLetters(req: Request, res: Response): Promise<void> {
  try {
    const { status, search, ownerNric, caseCreatedById, userRole, userId, page, limit } = req.query;
    const result = await offerService.getAllOfferLetters({
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

export async function getOfferLetterById(req: Request, res: Response): Promise<void> {
  const offerId = req.params.offerId as string;
  if (!offerId) {
    res.status(400).json({ error: "offerId is required" });
    return;
  }

  try {
    const offer = await offerService.getOfferLetterById(offerId);
    res.json({ offerLetter: offer });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(500).json({ error: msg });
    }
  }
}

export async function createOfferLetter(req: Request, res: Response): Promise<void> {
  const { compensationReportId, caseId, ownershipId, offerType, offerAmount, acceptancePeriodDays, remarks, createdById } = req.body;

  if (!compensationReportId || !caseId || !ownershipId) {
    res.status(400).json({ error: "compensationReportId, caseId, and ownershipId are required" });
    return;
  }
  if (offerAmount === undefined || offerAmount <= 0) {
    res.status(400).json({ error: "offerAmount must be a positive number" });
    return;
  }

  const userId = createdById || "00000000-0000-0000-0000-000000000001";

  try {
    const offer = await offerService.createOfferLetter({
      compensationReportId,
      caseId,
      ownershipId,
      offerType,
      offerAmount: parseFloat(offerAmount),
      acceptancePeriodDays: acceptancePeriodDays ? parseInt(acceptancePeriodDays, 10) : 14,
      remarks,
      createdById: userId,
    });
    res.status(201).json({ offerLetter: offer });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function acceptOffer(req: Request, res: Response): Promise<void> {
  const offerId = req.params.offerId as string;
  const { forceAccept, ownerNric, ownerId, userId } = req.body;
  let signedDocument = req.body.signedDocument as string | undefined;

  if (!offerId) {
    res.status(400).json({ error: "offerId is required" });
    return;
  }

  try {
    // Look up offer letter to get caseId for folder placement
    const existingOffer = await prisma.offerLetter.findUnique({
      where: { offerId },
      select: { caseId: true, offerReferenceNo: true },
    });
    const caseId = existingOffer?.caseId || "general";

    // Handle uploaded file if present
    if (req.file) {
      const storageDir = getOfferLetterStorageDir(caseId);
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      const safeName = `Signed_${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const targetFilePath = path.join(storageDir, safeName);
      fs.writeFileSync(targetFilePath, req.file.buffer);

      // Relative path stored in database
      signedDocument = `document_storage/offer_letter/${caseId}/${safeName}`;
    }

    const offer = await offerService.acceptOffer(
      offerId,
      signedDocument,
      Boolean(forceAccept === true || forceAccept === "true"),
      { ownerNric, ownerId, userId }
    );
    res.json({ offerLetter: offer });
  } catch (e: any) {
    const msg = e.message || "Accept offer failed";
    if (e.code === "ACTIVE_OBJECTION_EXISTS") {
      res.status(409).json({
        error: msg,
        code: "ACTIVE_OBJECTION_EXISTS",
        activeObjection: e.objection,
      });
      return;
    }
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}


export async function rejectOffer(req: Request, res: Response): Promise<void> {
  const offerId = req.params.offerId as string;
  const { remarks, ownerNric, ownerId, userId } = req.body;

  if (!offerId) {
    res.status(400).json({ error: "offerId is required" });
    return;
  }

  try {
    const offer = await offerService.rejectOffer(offerId, remarks, {
      ownerNric,
      ownerId,
      userId,
      remarks,
    });
    res.json({ offerLetter: offer });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function cancelAcceptance(req: Request, res: Response): Promise<void> {
  const offerId = req.params.offerId as string;
  const { ownerNric, ownerId, userId } = req.body;

  if (!offerId) {
    res.status(400).json({ error: "offerId is required" });
    return;
  }

  try {
    const offer = await offerService.cancelAcceptance(offerId, {
      ownerNric,
      ownerId,
      userId,
    });
    res.json({ offerLetter: offer });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}
