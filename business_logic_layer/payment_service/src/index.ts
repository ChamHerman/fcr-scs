import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import paymentRoutes from "./routes/payment.routes";

dotenv.config();

export const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/payments", paymentRoutes);

if (process.env.NODE_ENV !== "test") {
  const port = process.env.PORT || 3002;
  app.listen(port, () => {
    console.log(`Payment Service running on :${port}`);
  });
}
