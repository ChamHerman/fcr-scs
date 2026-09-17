import { Request, Response } from "express";
import * as svc from "../services/blockchain.service";
import * as ethereumService from "../services/ethereum.service";
import { AuthenticatedRequest } from "../../../user_management_service/src/middleware/auth.middleware";

/**
 * The acting admin, taken from the session only. The publish route's existing
 * walletAuth compares a body-supplied wallet address against one shared env
 * var, so it identifies no individual — and a "publishing by <name>" lock is
 * worthless if the name comes from the request body.
 */
function actingAdmin(req: Request): { adminId: string; adminName: string } | null {
  const user = (req as AuthenticatedRequest).user;
  if (!user?.userId || typeof user.userId !== "string" || !user.userId.trim()) return null;
  return { adminId: user.userId, adminName: user.name || "Government Admin" };
}

/** Maps a held-claim error onto a 409; returns false if `e` was something else. */
function respondClaimHeld(res: Response, e: unknown): boolean {
  if (e instanceof svc.PublishClaimHeldByError) {
    res.status(409).json({
      error: e.message,
      claimedBy: e.holderAdminId,
      claimedByName: e.holderAdminName,
      claimedAt: e.holderClaimedAt,
    });
    return true;
  }
  return false;
}

export async function getNetwork(_req: Request, res: Response): Promise<void> {
  try {
    const info = await ethereumService.getNetworkInfo();
    res.json(info);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}

export async function setNetwork(req: Request, res: Response): Promise<void> {
  const { network } = req.body as { network?: string };
  if (!network) {
    res.status(400).json({ error: "network is required" });
    return;
  }
  try {
    const active = ethereumService.setActiveNetwork(network);
    res.json(active);
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
}

export async function publish(req: Request, res: Response): Promise<void> {
  const { caseId, milestone, documentHash, transactionHash, onChainKey } = req.body as {
    caseId?: string;
    milestone?: string;
    documentHash?: string;
    transactionHash?: string;
    onChainKey?: string;
  };
  if (!caseId || !documentHash) {
    res.status(400).json({ error: "caseId and documentHash are required" });
    return;
  }
  if (!transactionHash) {
    res.status(400).json({ error: "transactionHash is required — send the publish transaction from the admin wallet in MetaMask first" });
    return;
  }
  try {
    const admin = actingAdmin(req);
    // Refuse a publish that another admin is holding, so the loser learns the
    // record is taken rather than clobbering the winner's transactionHash.
    if (admin) {
      await svc.assertNotClaimedByOther(caseId, svc.normalizeMilestone(milestone), admin.adminId);
    }
    const r = await svc.publishRecord({
      caseId,
      milestone,
      documentHash,
      transactionHash,
      onChainKey,
      adminId: admin?.adminId,
    });
    res.status(201).json({ transactionHash: r.transactionHash, record: r });
  } catch (e: unknown) {
    if (respondClaimHeld(res, e)) return;
    res.status(400).json({ error: (e as Error).message });
  }
}

/** POST /publish-claim — take the lock before starting the MetaMask flow. */
export async function claimPublish(req: Request, res: Response): Promise<void> {
  const { caseId, milestone } = req.body as { caseId?: string; milestone?: string };
  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  const admin = actingAdmin(req);
  if (!admin) {
    res.status(401).json({ error: "Unauthorized: a valid administrator session is required" });
    return;
  }
  try {
    const claim = await svc.claimPublish({ caseId, milestone, ...admin });
    res.status(201).json({ claim });
  } catch (e: unknown) {
    if (respondClaimHeld(res, e)) return;
    res.status(400).json({ error: (e as Error).message });
  }
}

/** DELETE /publish-claim — give the lock back after a failure or cancellation. */
export async function releasePublishClaim(req: Request, res: Response): Promise<void> {
  const { caseId, milestone } = req.body as { caseId?: string; milestone?: string };
  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  const admin = actingAdmin(req);
  if (!admin) {
    res.status(401).json({ error: "Unauthorized: a valid administrator session is required" });
    return;
  }
  try {
    const released = await svc.releasePublishClaim({ caseId, milestone, adminId: admin.adminId });
    res.json({ released });
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
}

/** GET /publish-claims — live locks, polled by every admin's publish pages. */
export async function listPublishClaims(_req: Request, res: Response): Promise<void> {
  try {
    res.json({ claims: await svc.getPublishClaims() });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}

export async function getRecords(req: Request, res: Response): Promise<void> {
  try {
    res.json({ records: await svc.getRecords(req.query.status as string | undefined) });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}

export async function getRecord(req: Request, res: Response): Promise<void> {
  try {
    const caseId = req.params.caseId as string;
    const record = await svc.getRecord(caseId, req.query.milestone as string | undefined);
    if (!record) {
      res.status(404).json({ error: "Record not found" });
      return;
    }
    res.json({ record });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}

export async function verify(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: "File is required" });
    return;
  }
  if (req.file.mimetype !== "application/pdf") {
    res.status(400).json({ error: "Only PDF files are accepted" });
    return;
  }
  if (req.file.size > 15 * 1024 * 1024) {
    res.status(400).json({ error: "File exceeds 15MB limit" });
    return;
  }
  try {
    res.json(await svc.verifyDocument(req.file.buffer));
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}
