import { Router } from "express";
import multer from "multer";
import * as ctrl from "../controllers/payment.controller";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post("/bank-details", ctrl.submitBankDetails);
router.post("/initiate", ctrl.initiate);
router.post("/authorise", ctrl.authorise);
router.post("/reject", ctrl.reject);
router.post("/retry", ctrl.retry);
router.post("/request-details-update", ctrl.requestDetailsUpdate);
router.post("/schedule-tomorrow", ctrl.scheduleTomorrow);
router.get("/status/:caseId", ctrl.getStatus);
router.get("/pending-authorisations", ctrl.getPendingAuthorisations);
router.get("/failed", ctrl.getFailedTransactions);
router.get("/receipt/:caseId", ctrl.downloadReceipt);
router.post("/dispute", upload.single("file"), ctrl.dispute);

export default router;
