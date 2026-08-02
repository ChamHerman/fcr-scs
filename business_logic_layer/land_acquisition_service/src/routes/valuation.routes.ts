import { Router } from "express";
import multer from "multer";
import * as valReportCtrl from "../controllers/valuation.controller";

const upload = multer({ storage: multer.memoryStorage() });
const valuationRouter = Router();

valuationRouter.get("/valuation-reports", valReportCtrl.getAllReports);
valuationRouter.get("/valuation-reports/:reportId", valReportCtrl.getReportById);
valuationRouter.post(
  "/valuation-reports",
  upload.fields([
    { name: "buildingAssessment", maxCount: 1 },
    { name: "siteInspection", maxCount: 1 },
  ]),
  valReportCtrl.createReport
);
valuationRouter.post("/valuation-reports/:reportId/approve", valReportCtrl.approveReport);
valuationRouter.post("/valuation-reports/:reportId/reject", valReportCtrl.rejectReport);

export default valuationRouter;
