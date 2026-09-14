import path from "path";
import fs from "fs";
import * as dotenv from "dotenv";

// Load environment variables from single root .env or fallback
const candidateEnvPaths = [
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, ".env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
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
      "DATABASE_URL environment variable is missing! Please configure DATABASE_URL in your root .env file."
    );
  }
}

// Unified server port default is 3030
const PORT = process.env.SERVER_PORT || process.env.PORT || 3030;

// Import Express & service routes AFTER env configuration is loaded
import express from "express";
import cors from "cors";

import paymentRoutes from "./payment_service/src/routes/payment.routes";
import bankDetailsRoutes from "./payment_service/src/routes/bank-details.routes";
import blockchainRoutes from "./smart_contract_service/src/routes/blockchain.routes";
import landAcquisitionRoutes from "./land_acquisition_service/src/routes/land-acquisition.routes";
import compensationRoutes from "./compensation_management_service/src/routes/compensation.routes";
import reportRoutes from "./reporting_service/src/routes/report.routes";
import userRoutes from "./user_management_service/src/routes/user.routes";
import emailTemplateRoutes from "./user_management_service/src/routes/email-template.routes";
import auditRoutes from "./user_management_service/src/routes/audit.routes";
import predictionRoutes from "./ai_prediction_service/src/routes/ai-prediction.routes";

import { enforcePageAccess } from "./user_management_service/src/middleware/auth.middleware";

export const app = express();

app.use(cors());
app.use(express.json());

// Global RBAC enforcement for page access
app.use(enforcePageAccess);

// Serve static documents from document_storage
const documentStorageDir = path.resolve(__dirname, "../data_layer/document_storage");
app.use("/document_storage", express.static(documentStorageDir));
app.use("/api/document_storage", express.static(documentStorageDir));

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
app.use("/api/users", userRoutes);
app.use("/api/email-templates", emailTemplateRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/prediction", predictionRoutes);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] [INFO] [server] Unified Business Logic API Server listening on http://localhost:${PORT}`);
  });
}
