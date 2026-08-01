import { Router } from "express";
import multer from "multer";
import * as caseCtrl from "../controllers/case.controller";
import * as valuerCtrl from "../controllers/valuer.controller";
import * as assignCtrl from "../controllers/assignment.controller";
import * as valReportCtrl from "../controllers/valuation.controller";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// ─── Case Routes (Phase 1 & 2) ───────────────────────────────────────────────
router.get("/cases", caseCtrl.getAllCases);
router.get("/cases/stats", caseCtrl.getCaseStats);
router.get("/cases/unassigned", caseCtrl.getUnassignedCases);
router.get("/cases/:caseId", caseCtrl.getCaseById);

router.post("/cases", caseCtrl.createCase);
router.put("/cases/:caseId", caseCtrl.updateCase);
router.delete("/cases/:caseId", caseCtrl.deleteCase);

// Document Upload & Delete (Phase 2)
router.post("/cases/:caseId/documents", upload.single("file"), caseCtrl.uploadDocument);
router.delete("/documents/:documentId", caseCtrl.deleteDocument);

// ─── Valuer & Assignment Routes (Phase 3) ─────────────────────────────────────
router.get("/valuers", valuerCtrl.getAvailableValuers);
router.get("/assignments", assignCtrl.getAllAssignments);
router.post("/assignments", assignCtrl.assignValuer);

// ─── Valuation Report Routes (Phase 4) ────────────────────────────────────────
router.get("/valuation-reports", valReportCtrl.getAllReports);
router.get("/valuation-reports/:reportId", valReportCtrl.getReportById);
router.post("/valuation-reports", upload.fields([
  { name: "buildingAssessment", maxCount: 1 },
  { name: "siteInspection", maxCount: 1 }
]), valReportCtrl.createReport);
router.post("/valuation-reports/:reportId/approve", valReportCtrl.approveReport);
router.post("/valuation-reports/:reportId/reject", valReportCtrl.rejectReport);

export default router;
