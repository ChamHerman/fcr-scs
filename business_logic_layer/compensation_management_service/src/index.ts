import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import compensationRoutes from "./routes/compensation.routes";

dotenv.config();

export const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/compensation", compensationRoutes);

if (process.env.NODE_ENV !== "test") {
  const port = process.env.PORT || 3004;
  app.listen(port, () => {
    console.log(`[${new Date().toISOString()}] [INFO] [compensation-management-service] Listening on port ${port}`);
  });
}
