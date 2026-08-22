import { Router } from "express";
import {
  getOverviewStats,
  getCaseStatusReport,
  getPaymentReport,
  getBlockchainAuditReport,
} from "../controllers/report.controller";

const router = Router();

router.get("/overview", getOverviewStats);
router.get("/case-status", getCaseStatusReport);
router.get("/payment", getPaymentReport);
router.get("/blockchain-audit", getBlockchainAuditReport);

export default router;
