import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import compensationRoutes from "./routes/compensation.routes";
import { AppError } from "./utils/app-error";

dotenv.config();

export const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/compensation", compensationRoutes);

// Global Error Handler Middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, code: err.code });
  }
  console.error("Unhandled error in compensation-management-service:", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

if (process.env.NODE_ENV !== "test") {
  const port = process.env.PORT || 3004;
  app.listen(port, () => {
    console.log(`[${new Date().toISOString()}] [INFO] [compensation-management-service] Listening on port ${port}`);
  });
}
