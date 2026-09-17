import express, { Router } from "express";
import cors from "cors";
import reportRoutes from "./routes/report.routes";

const router = Router();
router.use("/", reportRoutes);

export const app = express();
app.use(
  cors({
    exposedHeaders: ["Content-Disposition", "X-Report-Id"],
  })
);
app.use(express.json());
app.use("/api/reports", reportRoutes);

export default router;
