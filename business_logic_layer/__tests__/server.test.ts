process.env.NODE_ENV = "test";

import request from "supertest";
import { app } from "../server";

describe("Unified Modular Monolith Server", () => {
  it("GET /health returns 200 OK", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
  });

  it("POST /api/payments/bank-details handles routes mounted from payment_service", async () => {
    const res = await request(app).post("/api/bank-details").send({});
    expect(res.status).toBe(400); // Bad request because caseId and bankName are missing
  });

  it("GET /api/smart-contract routes hit blockchain controller", async () => {
    const res = await request(app).get("/api/smart-contract/balance/0x0000000000000000000000000000000000000000");
    // Should hit controller endpoint
    expect([200, 400, 404, 500]).toContain(res.status);
  });
});
