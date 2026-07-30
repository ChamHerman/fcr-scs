import { Router } from "express";
import { submitBankDetails } from "../controllers/bank-details.controller";

const router = Router();
router.post("/", submitBankDetails);

export default router;
