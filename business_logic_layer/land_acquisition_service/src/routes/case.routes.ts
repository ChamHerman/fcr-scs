import { Router } from "express";
import multer from "multer";
import * as caseCtrl from "../controllers/case.controller";

const upload = multer({ storage: multer.memoryStorage() });
const caseRouter = Router();

// GET Endpoints (Read Operations)
caseRouter.get("/projects", caseCtrl.getAllProjects);
caseRouter.get("/cases", caseCtrl.getAllCases);
caseRouter.get("/cases/stats", caseCtrl.getCaseStats);
caseRouter.get("/cases/unassigned", caseCtrl.getUnassignedCases);
caseRouter.get("/cases/next-id", caseCtrl.getNextCaseId);
caseRouter.get("/cases/:caseId", caseCtrl.getCaseById);

// POST Endpoints (Write Operations - Create)
caseRouter.post("/cases", caseCtrl.createCase);

// Specific Section Update Endpoints (PATCH for RESTful updates)
caseRouter.patch("/cases/:caseId/title", caseCtrl.updateCaseTitle);
caseRouter.patch("/cases/:caseId/project", caseCtrl.updateProjectInformation);
caseRouter.patch("/cases/:caseId/land", caseCtrl.updateLandInformation);
caseRouter.patch("/cases/:caseId/owners", caseCtrl.updateOwnerInformation);

// Document Management Endpoints
caseRouter.post("/cases/:caseId/documents", upload.single("file"), caseCtrl.uploadDocument);
caseRouter.delete("/documents/:documentId", caseCtrl.deleteDocument);

// Whole-Case Update and Deletion
caseRouter.delete("/cases/:caseId", caseCtrl.deleteCase);
caseRouter.patch("/cases/:caseId", caseCtrl.updateCase);

export default caseRouter;
