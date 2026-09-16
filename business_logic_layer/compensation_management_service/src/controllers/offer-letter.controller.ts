import { Request, Response } from "express";
import * as crypto from "crypto";
import fs from "fs";
import path from "path";
import * as offerService from "../services/offer-letter.service";
import { getOfferLetterStorageDir } from "../utils/storage.utils";
import { logAudit } from "../../../user_management_service/src/services/audit.service";

export async function getAllOfferLetters(req: Request, res: Response): Promise<void> {
  try {
    const { caseId, status, search, ownerNric, caseCreatedById, userRole, userId, page, limit } = req.query;
    const result = await offerService.getAllOfferLetters({
      caseId: caseId as string,
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
    res.json({ offerLetter: offer, offer });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(500).json({ error: msg });
    }
  }
}

export async function getOfferLetterByCaseId(req: Request, res: Response): Promise<void> {
  const caseId = req.params.caseId as string;
  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }

  try {
    const offer = await offerService.getOfferLetterByCaseId(caseId);
    res.json({ offerLetter: offer, offer });
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

  const userId = createdById || "00000000-0000-0000-0000-000000000001";

  try {
    const offer = await offerService.createOfferLetter({
      compensationReportId,
      caseId,
      ownershipId,
      offerType: offerType || "FULL_SETTLEMENT",
      offerAmount: parseFloat(offerAmount) || 0,
      acceptancePeriodDays: acceptancePeriodDays ? parseInt(acceptancePeriodDays, 10) : undefined,
      remarks,
      createdById: userId,
    });

    logAudit({
      userId: (req as any).user?.userId || userId,
      userRole: (req as any).user?.role || "GOVERNMENT_OFFICER",
      activityType: "OFFER_LETTER_CREATED",
      moduleName: "COMPENSATION_MANAGEMENT",
      caseReference: caseId,
      severity: "INFO",
      ipAddress: req.ip || "127.0.0.1",
      deviceInfo: (req.headers["user-agent"] as string) || "Unknown",
      activityDetails: {
        offerId: (offer as any)?.offerLetterId,
        caseId,
        offerAmount,
        offerType,
      },
      systemResponse: "CREATED (201)",
    });

    res.status(201).json({ offerLetter: offer, offer });
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
}

export async function acceptOffer(req: Request, res: Response): Promise<void> {
  const offerId = req.params.offerId as string;
  const { forceAccept, ownerNric, ownerId, userId, clientHash } = req.body;
  let signedDocument = req.body.signedDocument as string | undefined;
  let documentHash: string | undefined;

  if (!offerId) {
    res.status(400).json({ error: "offerId is required" });
    return;
  }

  try {
    // Look up offer letter to get caseId for folder placement via service
    const caseId = await offerService.getOfferCaseId(offerId);

    // Handle uploaded file if present
    if (req.file) {
      // FR-019 anti-spoofing: the member browser computes SHA-256 over the
      // selected Form H PDF (Web Crypto) and submits it as clientHash. The
      // server recomputes over the received bytes — a mismatch means the
      // document was corrupted/altered in transit and is rejected outright.
      documentHash = "0x" + crypto.createHash("sha256").update(req.file.buffer).digest("hex");
      if (clientHash && String(clientHash).toLowerCase() !== documentHash.toLowerCase()) {
        res.status(400).json({
          error:
            "Document integrity check failed: the uploaded file does not match the fingerprint computed on your device. Please re-select the signed Form H PDF and try again.",
        });
        return;
      }

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
      { ownerNric, ownerId, userId, documentHash }
    );

    logAudit({
      userId: (req as any).user?.userId || userId || undefined,
      userRole: (req as any).user?.role || "DISPLACED_COMMUNITY_MEMBER",
      activityType: "OFFER_LETTER_ACCEPTED",
      moduleName: "COMPENSATION_MANAGEMENT",
      caseReference: caseId || undefined,
      severity: "INFO",
      ipAddress: req.ip || "127.0.0.1",
      deviceInfo: (req.headers["user-agent"] as string) || "Unknown",
      activityDetails: { offerId, caseId, signedDocument },
      systemResponse: "SUCCESS (200)",
    });

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

    const offerCaseId = (offer as any)?.caseId || (await offerService.getOfferCaseId(offerId).catch(() => undefined));
    logAudit({
      userId: (req as any).user?.userId || userId || undefined,
      userRole: (req as any).user?.role || "DISPLACED_COMMUNITY_MEMBER",
      activityType: "OFFER_LETTER_REJECTED",
      moduleName: "COMPENSATION_MANAGEMENT",
      caseReference: offerCaseId,
      severity: "WARNING",
      ipAddress: req.ip || "127.0.0.1",
      deviceInfo: (req.headers["user-agent"] as string) || "Unknown",
      activityDetails: { offerId, caseId: offerCaseId, remarks },
      systemResponse: "SUCCESS (200)",
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
