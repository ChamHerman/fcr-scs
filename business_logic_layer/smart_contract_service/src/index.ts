import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import blockchainRoutes from "./routes/blockchain.routes";
dotenv.config();

export const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/smart-contract", blockchainRoutes);

if (process.env.NODE_ENV !== "test") {
  const port = process.env.PORT || 3001;
  app.listen(port, () =>
    console.log("Smart Contract Service on :" + port)
  );
}
