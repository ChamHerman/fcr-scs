import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import paymentRoutes from "./routes/payment.routes";
import bankDetailsRoutes from "./routes/bank-details.routes";

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
}
