import supertest from "supertest";
import { app } from "../../../server";

const request = supertest(app);

describe("Compensation Management API - Phase 5 to 8 Tests", () => {
  describe("Phase 5: Compensation Reports", () => {
    it("GET /api/compensation/reports - should return list of compensation reports", async () => {
      const res = await request.get("/api/compensation/reports");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("reports");
      expect(Array.isArray(res.body.reports)).toBe(true);
    });

    it("GET /api/compensation/reports/:reportId - should return 404 for non-existent report", async () => {
      const res = await request.get("/api/compensation/reports/00000000-0000-0000-0000-000000000000");
      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found");
    });
  });

  describe("Phase 6: Offer Letters", () => {
    it("GET /api/compensation/offer-letters - should return list of offer letters", async () => {
      const res = await request.get("/api/compensation/offer-letters");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("offerLetters");
      expect(Array.isArray(res.body.offerLetters)).toBe(true);
    });

    it("POST /api/compensation/offer-letters - should validate input", async () => {
      const res = await request.post("/api/compensation/offer-letters").send({});
      expect(res.status).toBe(400);
    });
  });

  describe("Phase 7: Objections", () => {
    it("GET /api/compensation/objections - should return list of objections", async () => {
      const res = await request.get("/api/compensation/objections");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("objections");
      expect(Array.isArray(res.body.objections)).toBe(true);
    });
  });

  describe("Phase 8: Comparisons", () => {
    it("POST /api/compensation/comparisons - should require at least 2 case IDs", async () => {
      const res = await request.post("/api/compensation/comparisons").send({ caseIds: ["1"] });
      expect(res.status).toBe(400);
    });
  });
});
