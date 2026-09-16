import { Router } from "express";
import multer from "multer";
import { walletAuth } from "../middleware/walletAuth";
import * as ctrl from "../controllers/blockchain.controller";
import { authenticate, requireRole } from "../../../user_management_service/src/middleware/auth.middleware";
import { UserRole } from "@prisma/client";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

const gaOnly = [authenticate, requireRole(UserRole.GOVERNMENT_ADMINISTRATOR)];

router.get("/network", ctrl.getNetwork);
router.post("/network", ctrl.setNetwork);
// Authenticated as well as wallet-checked: the publish must know which admin is
// acting, both to honour another admin's claim and to release its own.
router.post("/publish", authenticate, walletAuth, ctrl.publish);
router.get("/records", ctrl.getRecords);
router.get("/records/:caseId", ctrl.getRecord);
router.post("/verify", upload.single("file"), ctrl.verify);

// Cross-admin publish lock. The list is polled by every admin's publish pages,
// so it stays behind the same GA gate rather than being public.
router.post("/publish-claim", ...gaOnly, ctrl.claimPublish);
router.delete("/publish-claim", ...gaOnly, ctrl.releasePublishClaim);
router.get("/publish-claims", ...gaOnly, ctrl.listPublishClaims);

export default router;
