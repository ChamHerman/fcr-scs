import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import paymentRoutes from "./routes/payment.routes";
import bankDetailsRoutes from "./routes/bank-details.routes";
import { checkAndAutoExecuteScheduledTransfers } from "./services/payment.service";

dotenv.config();

export const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/payments", paymentRoutes);
app.use("/api/bank-details", bankDetailsRoutes);

if (process.env.NODE_ENV !== "test") {
  const port = process.env.PORT || 3002;
  app.listen(port, () => {
    console.log(`[${new Date().toISOString()}] [INFO] [payment-service] Listening on port ${port}`);
  });

  // Periodically check and auto-execute scheduled transfers whose execution datetime has passed
  setInterval(() => {
    checkAndAutoExecuteScheduledTransfers().catch((err) => {
      console.error("[payment-service] Scheduled transfer execution interval error:", err);
    });
  }, 10_000);
}
