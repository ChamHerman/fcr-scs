import { Router } from "express";
import multer from "multer";
import * as objCtrl from "../controllers/objection.controller";

const upload = multer({ storage: multer.memoryStorage() });
const objectionRouter = Router();

objectionRouter.get("/objections", objCtrl.getAllObjections);
objectionRouter.get("/objections/:objectionId", objCtrl.getObjectionById);
objectionRouter.post("/objections", upload.array("documents", 5), objCtrl.createObjection);
objectionRouter.post("/objections/:objectionId/approve", objCtrl.approveObjection);
objectionRouter.post("/objections/:objectionId/reject", objCtrl.rejectObjection);

export default objectionRouter;
