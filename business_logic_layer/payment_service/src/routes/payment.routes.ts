import { Router } from "express";
import multer from "multer";
import * as ctrl from "../controllers/payment.controller";
import { authenticate, requireRole } from "../../../user_management_service/src/middleware/auth.middleware";
import { UserRole } from "@prisma/client";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Bank details submission (from landowner or member)
router.post("/bank-details", ctrl.submitBankDetails);

// Mutations - Government Administrator only
router.post("/initiate", authenticate, requireRole(UserRole.GOVERNMENT_ADMINISTRATOR), ctrl.initiate);
router.post("/authorise", authenticate, requireRole(UserRole.GOVERNMENT_ADMINISTRATOR), ctrl.authorise);
router.post("/confirm-execution", authenticate, requireRole(UserRole.GOVERNMENT_ADMINISTRATOR), ctrl.confirmExecution);
router.post("/reject", authenticate, requireRole(UserRole.GOVERNMENT_ADMINISTRATOR), ctrl.reject);
router.post("/cancel", authenticate, requireRole(UserRole.GOVERNMENT_ADMINISTRATOR), ctrl.cancel);
router.post("/retry", authenticate, requireRole(UserRole.GOVERNMENT_ADMINISTRATOR), ctrl.retry);
router.post("/request-details-update", authenticate, requireRole(UserRole.GOVERNMENT_ADMINISTRATOR), ctrl.requestDetailsUpdate);
router.post("/schedule-tomorrow", authenticate, requireRole(UserRole.GOVERNMENT_ADMINISTRATOR), ctrl.scheduleTomorrow);

// Read routes - Government Administrator, System Administrator & Displaced Community Member
router.get("/status/:caseId", authenticate, requireRole(UserRole.GOVERNMENT_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR, UserRole.DISPLACED_COMMUNITY_MEMBER), ctrl.getStatus);
router.get("/cases", authenticate, requireRole(UserRole.GOVERNMENT_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR, UserRole.DISPLACED_COMMUNITY_MEMBER), ctrl.getAllCases);
router.get("/pending-authorisations", authenticate, requireRole(UserRole.GOVERNMENT_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR), ctrl.getPendingAuthorisations);
router.get("/failed", authenticate, requireRole(UserRole.GOVERNMENT_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR), ctrl.getFailedTransactions);
router.get("/cases/:caseId/receipt", authenticate, requireRole(UserRole.GOVERNMENT_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR, UserRole.DISPLACED_COMMUNITY_MEMBER), ctrl.downloadReceipt);

// Receipt confirmation route (Member and Government Administrator)
router.post("/confirm-receipt", ctrl.confirmReceipt);

// Dispute route
router.post("/dispute", upload.single("file"), ctrl.dispute);

// Saved bank details for members
router.get("/saved-bank-details", authenticate, ctrl.getSavedBankDetails);
router.post("/saved-bank-details", authenticate, ctrl.saveDefaultBankDetails);
// Bank clearance simulation portal routes
router.get("/bank/pending", ctrl.getBankPending);
router.post("/bank/approve", ctrl.approveBank);
router.post("/bank/reject", ctrl.rejectBank);
router.get("/bank/history", ctrl.getBankHistory);

export default router;
