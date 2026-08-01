import path from "path";
import * as dotenv from "dotenv";

// Capture explicit SERVER_PORT or PORT before sub-service .env files override it
const explicitPort = process.env.SERVER_PORT || (process.env.PORT && !["3001", "3002"].includes(process.env.PORT) ? process.env.PORT : undefined);

// Load environment variables from sub-service .env files BEFORE importing service routes
dotenv.config({ path: path.resolve(__dirname, "./smart_contract_service/.env") });
dotenv.config({ path: path.resolve(__dirname, "./payment_service/.env") });
dotenv.config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://fcr_app:postgres@127.0.0.1:5432/fcr_scs?schema=public";
}

// Unified server port default is 3030
const PORT = explicitPort || 3030;

// Import Express & service routes AFTER env configuration is loaded
import express from "express";
import cors from "cors";

import paymentRoutes from "./payment_service/src/routes/payment.routes";
import bankDetailsRoutes from "./payment_service/src/routes/bank-details.routes";
import blockchainRoutes from "./smart_contract_service/src/routes/blockchain.routes";

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

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] [INFO] [server] Unified Business Logic API Server listening on http://localhost:${PORT}`);
  });
}
