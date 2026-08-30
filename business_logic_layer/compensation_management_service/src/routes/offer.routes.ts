import { Router } from "express";
import multer from "multer";
import * as offerCtrl from "../controllers/offer-letter.controller";

const upload = multer({ storage: multer.memoryStorage() });
const offerRouter = Router();

offerRouter.get("/offer-letters", offerCtrl.getAllOfferLetters);
offerRouter.get("/offer-letters/:offerId", offerCtrl.getOfferLetterById);
offerRouter.post("/offer-letters", offerCtrl.createOfferLetter);
offerRouter.post("/offer-letters/:offerId/accept", upload.single("signedDocument"), offerCtrl.acceptOffer);
offerRouter.post("/offer-letters/:offerId/cancel-acceptance", offerCtrl.cancelAcceptance);
offerRouter.post("/offer-letters/:offerId/reject", offerCtrl.rejectOffer);

export default offerRouter;
