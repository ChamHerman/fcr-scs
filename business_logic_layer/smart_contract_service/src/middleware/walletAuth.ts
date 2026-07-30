import { Request, Response, NextFunction } from "express";

export function walletAuth(req: Request, res: Response, next: NextFunction): void {
  const { walletAddress } = req.body as { walletAddress?: string };
  const authorised = process.env.ADMIN_WALLET_ADDRESS;
  if (!walletAddress) {
    res.status(400).json({ error: "Wallet address required" });
    return;
  }
  if (!authorised || walletAddress.toLowerCase() !== authorised.toLowerCase()) {
    res.status(403).json({ error: "Unauthorised wallet" });
    return;
  }
  next();
}
