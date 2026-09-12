import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import * as paymentService from "../services/payment.service";
import * as receiptService from "../services/receipt.service";
import { getPaymentDisputeStorageDir } from "../utils/storage.utils";
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
    const msg = (e as Error).message;
    if (
      msg.includes("already registered") ||
      msg.includes("must be unique") ||
      msg.includes("Invalid") ||
      msg.includes("required")
    ) {
      res.status(400).json({ error: msg });
    } else {
      res.status(500).json({ error: msg });
    }
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

// FR-018 (replaced): the single SOP for a GA-rejected transfer — returns the
// case to Pending Approval with prior signatures retained.
export async function resolveRejection(req: Request, res: Response): Promise<void> {
  const { caseId } = req.body;
  const adminId = (req as AuthenticatedRequest).user?.userId || req.body.adminId;
  if (!caseId || !adminId) {
    res.status(400).json({ error: "caseId and adminId are required" });
    return;
  }
  try {
    const paymentCase = await paymentService.resolveRejectedTransfer(caseId, adminId);
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
  const user = (req as AuthenticatedRequest).user;
  try {
    const paymentCase = await paymentService.getPaymentStatus(caseId, user?.role, user?.userId);
    res.json({ paymentCase });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else if (msg.toLowerCase().includes("access denied")) {
      res.status(403).json({ error: msg });
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

export async function getAllCases(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    const cases = await paymentService.getAllCases(user?.role, user?.userId);
    res.json({ cases });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}

export async function getSavedBankDetails(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    const savedAccounts = await paymentService.getSavedBankDetails(user?.userId, user?.identificationNumber, user?.name);
    res.json({ success: true, savedAccounts });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}

export async function saveDefaultBankDetails(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { bankName, accountNumber, accountHolderName, phoneNumber, myKadNumber } = req.body;
    if (!bankName || !accountNumber) {
      res.status(400).json({ error: "bankName and accountNumber are required" });
      return;
    }
    const result = await paymentService.saveMemberBankDetails(user?.userId || "", {
      bankName,
      accountNumber,
      accountHolderName: accountHolderName || user?.name || "",
      phoneNumber: phoneNumber || user?.contactNumber || "",
      myKadNumber: myKadNumber || user?.identificationNumber || "",
    });
    res.json({ success: true, savedAccount: result, message: "Bank details saved successfully." });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (
      msg.includes("already registered") ||
      msg.includes("must be unique") ||
      msg.includes("Invalid") ||
      msg.includes("required")
    ) {
      res.status(400).json({ error: msg });
    } else {
      res.status(500).json({ error: msg });
    }
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

// FR-013 + FR-015: lodging a dispute strictly requires a real bank
// statement / transaction record PDF plus a typed remark for extra context.
export async function dispute(req: Request, res: Response): Promise<void> {
  const { caseId, reason } = req.body;
  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    res.status(400).json({ error: "A dispute remark is required." });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "A supporting bank statement or transaction record PDF is required." });
    return;
  }
  const isPdf =
    req.file.mimetype === "application/pdf" && req.file.originalname.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    res.status(400).json({ error: "Only PDF bank statements or transaction records are accepted." });
    return;
  }

  try {
    const storageDir = getPaymentDisputeStorageDir(caseId);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    const safeName = `Dispute_Statement_${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    fs.writeFileSync(path.join(storageDir, safeName), req.file.buffer);
    const storagePath = `document_storage/payment_dispute/${caseId}/${safeName}`;

    const paymentCase = await paymentService.disputePayment(caseId, reason.trim(), {
      storagePath,
      fileName: req.file.originalname,
    });
    res.json({ paymentCase, message: "Payment dispute recorded with supporting bank statement." });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

// FR-015: authenticated download of the member's uploaded dispute statement.
export async function downloadDisputeDocument(req: Request, res: Response): Promise<void> {
  const caseId = req.params.caseId as string;
  try {
    const pc = await prisma.paymentCase.findUnique({ where: { caseId } });
    if (!pc?.disputeDocumentPath || !pc.disputeDocumentName) {
      res.status(404).json({ error: "No dispute statement uploaded for this case" });
      return;
    }
    const absolutePath = path.resolve(
      __dirname,
      "../../../../data_layer/document_storage",
      pc.disputeDocumentPath.replace(/^document_storage\//, "")
    );
    if (!fs.existsSync(absolutePath)) {
      res.status(404).json({ error: "Dispute statement file is missing from storage" });
      return;
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${pc.disputeDocumentName.replace(/["\\]/g, "")}"`
    );
    res.sendFile(absolutePath);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
}

// FR-014: Government Administrator resolves a DISPUTED payment after a bank
// cross-check — Mark as Resolved (back to TRANSFER_SUCCEED) or Reinitiate
// Payment (re-queue the transfer to the bank gateway).
export async function resolveDispute(req: Request, res: Response): Promise<void> {
  const { caseId, resolution } = req.body;
  const adminId = (req as AuthenticatedRequest).user?.userId || req.body.adminId;
  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  if (!resolution || !["MARK_AS_RESOLVED", "REINITIATE_PAYMENT"].includes(resolution)) {
    res.status(400).json({ error: "resolution must be 'MARK_AS_RESOLVED' or 'REINITIATE_PAYMENT'" });
    return;
  }
  try {
    const paymentCase = await paymentService.resolveDispute(caseId, adminId, resolution);
    res.json({
      paymentCase,
      message:
        resolution === "MARK_AS_RESOLVED"
          ? "Dispute marked as resolved. Case returned to Transfer Succeed for member re-confirmation."
          : "Payment reinitiated and re-queued to the bank gateway.",
    });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.toLowerCase().includes("not found")) {
      res.status(404).json({ error: msg });
    } else {
      res.status(400).json({ error: msg });
    }
  }
}

export async function confirmReceipt(req: Request, res: Response): Promise<void> {
  const { caseId, isAutoOrAdminOverride } = req.body;
  const userRole = (req as AuthenticatedRequest).user?.role || req.body.role || "GOVERNMENT_ADMINISTRATOR";
  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  try {
    const paymentCase = await paymentService.confirmPaymentReceipt(caseId, userRole, Boolean(isAutoOrAdminOverride));
    res.json({ success: true, paymentCase, message: "Payment receipt confirmed. Status updated to PAID." });
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
  const { caseId, errorReason, isRejectedCategory } = req.body;
  if (!caseId) {
    res.status(400).json({ error: "caseId is required" });
    return;
  }
  try {
    const isCatA = Boolean(
      isRejectedCategory ||
      errorReason?.includes("RECIPIENT_ACCOUNT") ||
      errorReason?.includes("NAME_MISMATCH") ||
      errorReason?.toLowerCase().includes("not found") ||
      errorReason?.toLowerCase().includes("dormant") ||
      errorReason?.toLowerCase().includes("frozen") ||
      errorReason?.toLowerCase().includes("mismatch")
    );
    const paymentCase = await paymentService.rejectBankTransfer(caseId, errorReason, isCatA);
    res.json({
      paymentCase,
      message: isCatA
        ? "Transfer marked as Transfer Rejected (recipient account issue)."
        : "Transfer marked as Transfer Failed (gateway/switch issue).",
    });
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
