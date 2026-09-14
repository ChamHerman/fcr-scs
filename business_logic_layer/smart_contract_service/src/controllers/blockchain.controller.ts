import { Request, Response } from "express";
import * as svc from "../services/blockchain.service";
import * as ethereumService from "../services/ethereum.service";

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
    const r = await svc.publishRecord({ caseId, milestone, documentHash, transactionHash, onChainKey });
    res.status(201).json({ transactionHash: r.transactionHash, record: r });
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
}

export async function voidLedger(req: Request, res: Response): Promise<void> {
  const { caseId, milestone, voidReason, transactionHash } = req.body as {
    caseId?: string;
    milestone?: string;
    voidReason?: string;
    transactionHash?: string;
  };
  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  if (!voidReason) {
    res.status(400).json({ error: "Void reason is required" });
    return;
  }
  if (!transactionHash) {
    res.status(400).json({ error: "transactionHash is required — send the void transaction from the admin wallet in MetaMask first" });
    return;
  }
  try {
    const r = await svc.voidRecord({ caseId, milestone, voidReason, transactionHash });
    res.json({ transactionHash: r.voidTransactionHash, record: r });
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
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
