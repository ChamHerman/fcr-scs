import { Router } from "express";
import * as offerCtrl from "../controllers/offer-letter.controller";

const offerRouter = Router();

offerRouter.get("/offer-letters", offerCtrl.getAllOfferLetters);
offerRouter.get("/offer-letters/:offerId", offerCtrl.getOfferLetterById);
offerRouter.post("/offer-letters", offerCtrl.createOfferLetter);
offerRouter.post("/offer-letters/:offerId/accept", offerCtrl.acceptOffer);
offerRouter.post("/offer-letters/:offerId/reject", offerCtrl.rejectOffer);

export default offerRouter;
