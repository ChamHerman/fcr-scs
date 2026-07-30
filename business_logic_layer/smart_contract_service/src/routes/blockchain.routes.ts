import { Router } from "express";
import multer from "multer";
import { walletAuth } from "../middleware/walletAuth";
import * as ctrl from "../controllers/blockchain.controller";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.get("/network", ctrl.getNetwork);
router.post("/publish", walletAuth, ctrl.publish);
router.post("/void", walletAuth, ctrl.voidLedger);
router.get("/records", ctrl.getRecords);
router.get("/records/:caseId", ctrl.getRecord);
router.post("/verify", upload.single("file"), ctrl.verify);

export default router;
