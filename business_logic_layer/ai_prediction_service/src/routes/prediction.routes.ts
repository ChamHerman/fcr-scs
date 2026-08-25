import { Router } from "express";
import multer from "multer";
import * as predictionCtrl from "../controllers/prediction.controller";

const upload = multer({ storage: multer.memoryStorage() });

const predictionRouter = Router();

predictionRouter.post("/valuate", predictionCtrl.valuate);
predictionRouter.get("/model", predictionCtrl.getModelInfo);
predictionRouter.post("/retrain", upload.single("dataset"), predictionCtrl.retrainModel);
predictionRouter.post("/model/activate", predictionCtrl.activateModel);
predictionRouter.post("/model/discard", predictionCtrl.discardModel);
predictionRouter.get("/dataset-template", predictionCtrl.getDatasetTemplate);

export default predictionRouter;
