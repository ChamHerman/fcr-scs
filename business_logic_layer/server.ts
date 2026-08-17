import path from "path";
import fs from "fs";
import * as dotenv from "dotenv";

// Compute an env base directory that works in both source (business_logic_layer/) and built (business_logic_layer/dist/) layouts
const baseDir =
  fs.existsSync(path.resolve(__dirname, "smart_contract_service/.env")) ||
  fs.existsSync(path.resolve(__dirname, "payment_service/.env")) ||
  fs.existsSync(path.resolve(__dirname, "package.json"))
    ? __dirname
    : path.resolve(__dirname, "..");

// Capture explicit SERVER_PORT or PORT before sub-service .env files override it
const explicitPort = process.env.SERVER_PORT || (process.env.PORT && !["3001", "3002"].includes(process.env.PORT) ? process.env.PORT : undefined);

// Load environment variables from sub-service .env files BEFORE importing service routes
const envFiles = [
  path.resolve(baseDir, "smart_contract_service/.env"),
  path.resolve(baseDir, "payment_service/.env"),
  path.resolve(baseDir, ".env"),
];

for (const envPath of envFiles) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  } else if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
    console.warn(`[WARN] [server] Environment file not found at: ${envPath}`);
  }
}

dotenv.config();

if (!process.env.DATABASE_URL) {
  if (process.env.ALLOW_DEV_DB_FALLBACK === "true") {
    console.warn(
      "[WARN] [server] DATABASE_URL is missing. Using dev fallback database URL because ALLOW_DEV_DB_FALLBACK=true is set."
    );
    process.env.DATABASE_URL = "postgresql://fcr_app:postgres@127.0.0.1:5432/fcr_scs?schema=public";
  } else if (process.env.NODE_ENV !== "test") {
    throw new Error(
      "DATABASE_URL environment variable is missing! Please configure DATABASE_URL in your environment or .env file (or set ALLOW_DEV_DB_FALLBACK=true for local dev)."
    );
  }
}

// Unified server port default is 3030
const PORT = explicitPort || 3030;

// Import Express & service routes AFTER env configuration is loaded
import express from "express";
import cors from "cors";

import paymentRoutes from "./payment_service/src/routes/payment.routes";
import bankDetailsRoutes from "./payment_service/src/routes/bank-details.routes";
import blockchainRoutes from "./smart_contract_service/src/routes/blockchain.routes";
import landAcquisitionRoutes from "./land_acquisition_service/src/routes/land-acquisition.routes";
import compensationRoutes from "./compensation_management_service/src/routes/compensation.routes";
import reportRoutes from "./reporting_service/src/routes/report.routes";

export const app = express();

app.use(cors());
app.use(express.json());

// Health Check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "Unified Modular Monolith Backend",
    timestamp: new Date().toISOString(),
  });
});

// Mount domain routes to unified /api endpoints
app.use("/api/payments", paymentRoutes);
app.use("/api/bank-details", bankDetailsRoutes);
app.use("/api/smart-contract", blockchainRoutes);
app.use("/api/land-acquisition", landAcquisitionRoutes);
app.use("/api/compensation", compensationRoutes);
app.use("/api/reports", reportRoutes);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] [INFO] [server] Unified Business Logic API Server listening on http://localhost:${PORT}`);
  });
}
