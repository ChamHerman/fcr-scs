import { Router } from "express";
import * as valuerCtrl from "../controllers/valuer.controller";
import * as assignCtrl from "../controllers/assignment.controller";

const assignmentRouter = Router();

assignmentRouter.get("/valuers", valuerCtrl.getAvailableValuers);
assignmentRouter.get("/assignments", assignCtrl.getAllAssignments);
assignmentRouter.post("/assignments", assignCtrl.assignValuer);

export default assignmentRouter;
