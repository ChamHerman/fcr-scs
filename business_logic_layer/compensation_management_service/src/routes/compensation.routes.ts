import { Router } from "express";
import reportRouter from "./report.routes";
import offerRouter from "./offer.routes";
import objectionRouter from "./objection.routes";
import comparisonRouter from "./comparison.routes";

const router = Router();

// Compose sub-domain routers (Decomposition & Modularization)
router.use(reportRouter);
router.use(offerRouter);
router.use(objectionRouter);
router.use(comparisonRouter);

export default router;
