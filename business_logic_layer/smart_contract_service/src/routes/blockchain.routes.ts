import { Router } from "express";
import multer from "multer";
import { walletAuth } from "../middleware/walletAuth";
import * as ctrl from "../controllers/blockchain.controller";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.get("/network", ctrl.getNetwork);
router.post("/network", ctrl.setNetwork);
router.post("/publish", walletAuth, ctrl.publish);
router.get("/records", ctrl.getRecords);
router.get("/records/:caseId", ctrl.getRecord);
router.post("/verify", upload.single("file"), ctrl.verify);

export default router;
