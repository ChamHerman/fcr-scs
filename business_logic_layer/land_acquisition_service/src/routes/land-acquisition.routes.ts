import { Router } from "express";
import caseRouter from "./case.routes";
import assignmentRouter from "./assignment.routes";
import valuationRouter from "./valuation.routes";

const router = Router();

// Compose sub-domain routers (Decomposition & Modularization)
router.use(caseRouter);
router.use(assignmentRouter);
router.use(valuationRouter);

export default router;
