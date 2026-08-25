import { Router } from "express";
import predictionRouter from "./prediction.routes";

const router = Router();

// Compose sub-domain routers
router.use(predictionRouter);

export default router;
