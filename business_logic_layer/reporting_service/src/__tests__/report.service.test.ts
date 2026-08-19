import request from "supertest";
import { app } from "../index";

describe("Reporting Service Integration & PDF Generation", () => {
  it("GET /api/reports/overview returns dashboard stats", async () => {
    const res = await request(app).get("/api/reports/overview");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("kpis");
    expect(res.body).toHaveProperty("caseStatusDistribution");
    expect(res.body).toHaveProperty("paymentStatusDistribution");
    expect(res.body).toHaveProperty("blockchainStatusDistribution");
  });

  it("GET /api/reports/case-status returns JSON by default", async () => {
    const res = await request(app).get("/api/reports/case-status");
    expect(res.status).toBe(200);
    expect(res.body.reportType).toBe("Case Status Report");
    expect(res.body).toHaveProperty("summary");
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it("GET /api/reports/case-status?format=pdf returns PDF buffer", async () => {
    const res = await request(app).get("/api/reports/case-status?format=pdf");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.headers["content-disposition"]).toContain(".pdf");
  });

  it("GET /api/reports/payment returns JSON and calculates summaries", async () => {
    const res = await request(app).get("/api/reports/payment");
    expect(res.status).toBe(200);
    expect(res.body.reportType).toBe("Payment Report");
    expect(res.body).toHaveProperty("summary");
  });

  it("GET /api/reports/payment?format=pdf returns PDF buffer", async () => {
    const res = await request(app).get("/api/reports/payment?format=pdf");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
  });

  it("GET /api/reports/blockchain-audit returns JSON audit records", async () => {
    const res = await request(app).get("/api/reports/blockchain-audit");
    expect(res.status).toBe(200);
    expect(res.body.reportType).toBe("Blockchain Audit Report");
    expect(res.body).toHaveProperty("summary");
  });

  it("GET /api/reports/blockchain-audit?format=pdf returns PDF buffer", async () => {
    const res = await request(app).get("/api/reports/blockchain-audit?format=pdf");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
  });
});
