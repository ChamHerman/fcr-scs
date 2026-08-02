import { Router } from "express";
import * as compCtrl from "../controllers/compensation-report.controller";

const reportRouter = Router();

reportRouter.get("/reports", compCtrl.getAllReports);
reportRouter.get("/reports/:reportId", compCtrl.getReportById);
reportRouter.post("/reports", compCtrl.createReport);
reportRouter.post("/reports/:reportId/approve", compCtrl.approveReport);
reportRouter.post("/reports/:reportId/reject", compCtrl.rejectReport);

export default reportRouter;
