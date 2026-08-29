import { Router } from "express";
import reportRouter from "./report.routes";
import offerRouter from "./offer.routes";
import objectionRouter from "./objection.routes";

const router = Router();

// Compose sub-domain routers (Decomposition & Modularization)
router.use(reportRouter);
router.use(offerRouter);
router.use(objectionRouter);

export default router;
