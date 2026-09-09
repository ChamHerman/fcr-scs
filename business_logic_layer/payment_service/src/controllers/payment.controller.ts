import { Request, Response } from "express";
import * as paymentService from "../services/payment.service";
import * as receiptService from "../services/receipt.service";
import { prisma } from "../prisma";
import { AuthenticatedRequest } from "../../../user_management_service/src/middleware/auth.middleware";

export async function submitBankDetails(req: Request, res: Response): Promise<void> {
  const { caseId: rawCaseId, paymentCaseId, bankName, accountNumber, accountHolderName, phoneNumber, myKadNumber } = req.body;
  const caseId = rawCaseId || paymentCaseId;
  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  if (!bankName) {
    res.status(400).json({ error: "bankName is required" });
    return;
  }
  try {
    const paymentCase = await paymentService.submitBankDetails({
      caseId,
      bankName,
      accountNumber,
      accountHolderName,
      phoneNumber,
      myKadNumber,
    });

    // Also persist encrypted record into receiver_bank_details if available
    try {
      const encryptedBankDetails = Buffer.from(accountNumber || "").toString("base64");
      await prisma.receiverBankDetails.upsert({
        where: { paymentCaseId: paymentCase.id },
        update: {
          bankName,
          accountNumber,
          accountHolderName: accountHolderName || "",
          phoneNumber: phoneNumber || "",
          myKadNumber: myKadNumber || "",
          encryptedBankDetails,
        },
        create: {
          bankName,
          accountNumber,
          accountHolderName: accountHolderName || "",
          phoneNumber: phoneNumber || "",
          myKadNumber: myKadNumber || "",
          encryptedBankDetails,
          paymentCaseId: paymentCase.id,
        },
      });
    } catch {
      // Non-blocking fallback
    }

    res.json({ success: true, paymentCase });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}

export async function initiate(req: Request, res: Response): Promise<void> {
  const { caseId } = req.body;
  const adminId = (req as AuthenticatedRequest).user?.userId || req.body.adminId;
  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  if (!adminId) {
    res.status(400).json({ error: "adminId is required" });
    return;
  }
  try {
    const paymentCase = await paymentService.initiateTransfer(caseId, adminId);
    res.json({ paymentCase });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function authorise(req: Request, res: Response): Promise<void> {
  const { caseId } = req.body;
  const adminId = (req as AuthenticatedRequest).user?.userId || req.body.adminId;
  if (!caseId || !adminId) {
    res.status(400).json({ error: "caseId and adminId are required" });
    return;
  }
  try {
    const paymentCase = await paymentService.authoriseTransfer(caseId, adminId);
    res.json({ paymentCase });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function confirmExecution(req: Request, res: Response): Promise<void> {
  const { caseId } = req.body;
  const adminId = (req as AuthenticatedRequest).user?.userId || req.body.adminId;
  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  if (!adminId) {
    res.status(400).json({ error: "adminId is required" });
    return;
  }
  try {
    const paymentCase = await paymentService.confirmExecution(caseId, adminId);
    res.json({ paymentCase, message: "Disbursement execution confirmed and sent to bank clearance." });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function reject(req: Request, res: Response): Promise<void> {
  const { caseId, reason } = req.body;
  const adminId = (req as AuthenticatedRequest).user?.userId || req.body.adminId;
  if (!caseId || !adminId) {
    res.status(400).json({ error: "caseId and adminId are required" });
    return;
  }
  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    res.status(400).json({ error: "Rejection reason is required" });
    return;
  }
  try {
    const paymentCase = await paymentService.rejectTransfer(caseId, adminId, reason);
    res.json({ paymentCase });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function cancel(req: Request, res: Response): Promise<void> {
  const { caseId, reason } = req.body;
  const adminId = (req as AuthenticatedRequest).user?.userId || req.body.adminId;
  if (!caseId || !adminId) {
    res.status(400).json({ error: "caseId and adminId are required" });
    return;
  }
  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    res.status(400).json({ error: "Cancellation reason is required" });
    return;
  }
  try {
    const paymentCase = await paymentService.cancelPayment(caseId, adminId, reason);
    res.json({ paymentCase });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function retry(req: Request, res: Response): Promise<void> {
  const { caseId } = req.body;
  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  try {
    const paymentCase = await paymentService.retryPayment(caseId);
    res.json({ paymentCase });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function requestDetailsUpdate(req: Request, res: Response): Promise<void> {
  const { caseId } = req.body;
  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  try {
    const paymentCase = await paymentService.requestDetailsUpdate(caseId);
    res.json({ paymentCase });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function scheduleTomorrow(req: Request, res: Response): Promise<void> {
  const { caseId } = req.body;
  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  try {
    const paymentCase = await paymentService.scheduleTomorrow(caseId);
    res.json({ paymentCase });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function getStatus(req: Request, res: Response): Promise<void> {
  const caseId = req.params.caseId as string;
  try {
    const paymentCase = await paymentService.getPaymentStatus(caseId);
    res.json({ paymentCase });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(500).json({ error: msg });
    }
  }
}

export async function getPendingAuthorisations(_req: Request, res: Response): Promise<void> {
  try {
    const cases = await paymentService.getPendingAuthorisations();
    res.json({ cases });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}

export async function getAllCases(_req: Request, res: Response): Promise<void> {
  try {
    const cases = await paymentService.getAllCases();
    res.json({ cases });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}

export async function getFailedTransactions(_req: Request, res: Response): Promise<void> {
  try {
    const cases = await paymentService.getFailedTransactions();
    res.json({ cases });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}

export async function downloadReceipt(req: Request, res: Response): Promise<void> {
  const caseId = req.params.caseId as string;
  try {
    const pdfBuffer = await receiptService.generateReceipt(caseId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=receipt-${caseId}.pdf`);
    res.send(pdfBuffer);
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("no receipt")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(500).json({ error: msg });
    }
  }
}

export async function dispute(req: Request, res: Response): Promise<void> {
  const caseId = req.body.caseId;
  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  try {
    const paymentCase = await paymentService.disputePayment(caseId);
    res.json({ paymentCase });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function getBankPending(_req: Request, res: Response): Promise<void> {
  try {
    const cases = await paymentService.getBankPendingTransfers();
    res.json({ cases });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}

export async function approveBank(req: Request, res: Response): Promise<void> {
  const { caseId, bankReferenceNumber } = req.body;
  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  try {
    const paymentCase = await paymentService.approveBankTransfer(caseId, bankReferenceNumber);
    res.json({ paymentCase, message: "Bank transfer successfully approved and processed." });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function rejectBank(req: Request, res: Response): Promise<void> {
  const { caseId, errorReason } = req.body;
  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  try {
    const paymentCase = await paymentService.rejectBankTransfer(caseId, errorReason);
    res.json({ paymentCase, message: "Bank transfer rejected and recorded in failed logs." });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function getBankHistory(_req: Request, res: Response): Promise<void> {
  try {
    const cases = await paymentService.getBankHistory();
    res.json({ cases });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}
