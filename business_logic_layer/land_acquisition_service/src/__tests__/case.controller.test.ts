import supertest from "supertest";
import { app } from "../../../server";

const request = supertest(app);

describe("Land Acquisition API - Phase 1 to 4 Integration Tests", () => {
  // Phase 1 Tests
  describe("Phase 1: Foundation GET Endpoints", () => {
    it("GET /api/land-acquisition/cases - should return list of cases", async () => {
      const res = await request.get("/api/land-acquisition/cases");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("cases");
      expect(Array.isArray(res.body.cases)).toBe(true);
      expect(res.body).toHaveProperty("total");
    });

    it("GET /api/land-acquisition/cases/stats - should return case statistics", async () => {
      const res = await request.get("/api/land-acquisition/cases/stats");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("totalCases");
      expect(res.body).toHaveProperty("active");
      expect(res.body).toHaveProperty("completed");
      expect(res.body).toHaveProperty("pendingAction");
    });

    it("GET /api/land-acquisition/cases/unassigned - should return unassigned cases", async () => {
      const res = await request.get("/api/land-acquisition/cases/unassigned");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("cases");
      expect(Array.isArray(res.body.cases)).toBe(true);
    });

    it("GET /api/land-acquisition/cases/:caseId - should return 404 for non-existent case", async () => {
      const res = await request.get("/api/land-acquisition/cases/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
      expect(res.body.error).toContain("Case not found");
    });
  });

  // Phase 2 Tests
  describe("Phase 2: Case CRUD Operations", () => {
    it("POST /api/land-acquisition/cases - should validate missing required fields", async () => {
      const res = await request.post("/api/land-acquisition/cases").send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("PUT /api/land-acquisition/cases/:caseId/title - should validate missing title", async () => {
      const res = await request.put("/api/land-acquisition/cases/00000000-0000-0000-0000-000000000000/title").send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Case title is required");
    });

    it("PUT /api/land-acquisition/cases/:caseId/title - should return 404 for non-existent case", async () => {
      const res = await request.put("/api/land-acquisition/cases/00000000-0000-0000-0000-000000000000/title").send({
        caseTitle: "Updated Case Title",
      });
      expect(res.status).toBe(404);
      expect(res.body.error).toContain("Case not found");
    });
  });

  // Phase 3 Tests
  describe("Phase 3: Valuers & Case Assignment", () => {
    it("GET /api/land-acquisition/valuers - should return available land valuers", async () => {
      const res = await request.get("/api/land-acquisition/valuers");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("valuers");
      expect(Array.isArray(res.body.valuers)).toBe(true);
    });

    it("GET /api/land-acquisition/assignments - should return all case assignments", async () => {
      const res = await request.get("/api/land-acquisition/assignments");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("assignments");
      expect(Array.isArray(res.body.assignments)).toBe(true);
    });

    it("POST /api/land-acquisition/assignments - should validate missing fields", async () => {
      const res = await request.post("/api/land-acquisition/assignments").send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("caseId is required");
    });
  });

  // Phase 4 Tests
  describe("Phase 4: Valuation Reports", () => {
    it("GET /api/land-acquisition/valuation-reports - should return valuation reports", async () => {
      const res = await request.get("/api/land-acquisition/valuation-reports");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("reports");
      expect(Array.isArray(res.body.reports)).toBe(true);
    });

    it("GET /api/land-acquisition/valuation-reports/:reportId - should return 404 for non-existent report", async () => {
      const res = await request.get("/api/land-acquisition/valuation-reports/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found");
    });

    it("POST /api/land-acquisition/valuation-reports - should validate input fields", async () => {
      const res = await request.post("/api/land-acquisition/valuation-reports").send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("caseId is required");
    });
  });
});
