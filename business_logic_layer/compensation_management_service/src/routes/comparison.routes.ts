import { Router } from "express";
import * as compCtrl from "../controllers/comparison.controller";

const comparisonRouter = Router();

comparisonRouter.post("/comparisons", compCtrl.compareCases);

export default comparisonRouter;
