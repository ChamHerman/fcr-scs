import { Router } from "express";
import multer from "multer";
import * as compReportCtrl from "../controllers/compensation-report.controller";
import * as offerCtrl from "../controllers/offer-letter.controller";
import * as objectionCtrl from "../controllers/objection.controller";
import * as comparisonCtrl from "../controllers/comparison.controller";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// ─── Compensation Report Routes (Phase 5) ────────────────────────────────────
router.get("/reports", compReportCtrl.getAllReports);
router.get("/reports/:reportId", compReportCtrl.getReportById);
router.post("/reports", compReportCtrl.createReport);
router.post("/reports/:reportId/approve", compReportCtrl.approveReport);
router.post("/reports/:reportId/reject", compReportCtrl.rejectReport);

// ─── Offer Letter Routes (Phase 6) ───────────────────────────────────────────
router.get("/offer-letters", offerCtrl.getAllOfferLetters);
router.get("/offer-letters/:offerId", offerCtrl.getOfferLetterById);
router.post("/offer-letters", offerCtrl.createOfferLetter);
router.post("/offer-letters/:offerId/accept", offerCtrl.acceptOffer);
router.post("/offer-letters/:offerId/reject", offerCtrl.rejectOffer);

// ─── Objection Routes (Phase 7) ──────────────────────────────────────────────
router.get("/objections", objectionCtrl.getAllObjections);
router.get("/objections/:objectionId", objectionCtrl.getObjectionById);
router.post("/objections", upload.array("documents"), objectionCtrl.createObjection);
router.post("/objections/:objectionId/approve", objectionCtrl.approveObjection);
router.post("/objections/:objectionId/reject", objectionCtrl.rejectObjection);

// ─── Comparison Routes (Phase 8) ─────────────────────────────────────────────
router.post("/comparisons", comparisonCtrl.compareCases);

export default router;
