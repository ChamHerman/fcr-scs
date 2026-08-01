import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import landAcquisitionRoutes from "./routes/land-acquisition.routes";

dotenv.config();

export const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/land-acquisition", landAcquisitionRoutes);

if (process.env.NODE_ENV !== "test") {
  const port = process.env.PORT || 3003;
  app.listen(port, () => {
    console.log(`[${new Date().toISOString()}] [INFO] [land-acquisition-service] Listening on port ${port}`);
  });
}
