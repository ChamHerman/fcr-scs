import { Router } from "express";
import multer from "multer";
import * as caseCtrl from "../controllers/case.controller";

const upload = multer({ storage: multer.memoryStorage() });
const caseRouter = Router();

// GET Endpoints (Read Operations)
caseRouter.get("/cases", caseCtrl.getAllCases);
caseRouter.get("/cases/stats", caseCtrl.getCaseStats);
caseRouter.get("/cases/unassigned", caseCtrl.getUnassignedCases);
caseRouter.get("/cases/:caseId", caseCtrl.getCaseById);

// POST Endpoints (Write Operations - Create)
caseRouter.post("/cases", caseCtrl.createCase);

// Specific Section Update Endpoints (Placed BEFORE generic /cases/:caseId to prevent route swallowing)
caseRouter.post("/cases/:caseId/project", caseCtrl.updateProjectInformation);
caseRouter.put("/cases/:caseId/project", caseCtrl.updateProjectInformation);

caseRouter.post("/cases/:caseId/land", caseCtrl.updateLandInformation);
caseRouter.put("/cases/:caseId/land", caseCtrl.updateLandInformation);

caseRouter.post("/cases/:caseId/owners", caseCtrl.updateOwnerInformation);
caseRouter.post("/cases/:caseId/owner", caseCtrl.updateOwnerInformation);
caseRouter.put("/cases/:caseId/owners", caseCtrl.updateOwnerInformation);
caseRouter.put("/cases/:caseId/owner", caseCtrl.updateOwnerInformation);

caseRouter.post("/cases/:caseId/documents", upload.single("file"), caseCtrl.uploadDocument);
caseRouter.post("/documents/:documentId/delete", caseCtrl.deleteDocument);
caseRouter.delete("/documents/:documentId", caseCtrl.deleteDocument);

caseRouter.post("/cases/:caseId/delete", caseCtrl.deleteCase);
caseRouter.delete("/cases/:caseId", caseCtrl.deleteCase);

// Generic Whole-Case Update Endpoints (Placed last)
caseRouter.post("/cases/:caseId", caseCtrl.updateCase);
caseRouter.put("/cases/:caseId", caseCtrl.updateCase);

export default caseRouter;
