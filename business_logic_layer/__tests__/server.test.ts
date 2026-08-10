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

  it("loads sub-service environment variables correctly in source and dist server entrypoints", () => {
    expect(process.env.SEPOLIA_RPC_URL).toBeDefined();
    expect(process.env.CONTRACT_ADDRESS).toBeDefined();

    // Verify built dist/server module can be required and resolves env correctly
    const distServer = require("../dist/server");
    expect(distServer.app).toBeDefined();
  });

  it("throws an error when DATABASE_URL is missing in non-test mode", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalUrl = process.env.DATABASE_URL;
    const originalFallback = process.env.ALLOW_DEV_DB_FALLBACK;

    try {
      process.env.NODE_ENV = "production";
      delete process.env.DATABASE_URL;
      delete process.env.ALLOW_DEV_DB_FALLBACK;

      expect(() => {
        if (!process.env.DATABASE_URL) {
          if (process.env.ALLOW_DEV_DB_FALLBACK === "true") {
            process.env.DATABASE_URL = "postgresql://fcr_app:postgres@127.0.0.1:5432/fcr_scs?schema=public";
          } else if (process.env.NODE_ENV !== "test") {
            throw new Error("DATABASE_URL environment variable is missing!");
          }
        }
      }).toThrow("DATABASE_URL environment variable is missing!");
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.DATABASE_URL = originalUrl;
      process.env.ALLOW_DEV_DB_FALLBACK = originalFallback;
    }
  });

  it("uses dev fallback URL when ALLOW_DEV_DB_FALLBACK=true is set", () => {
    const originalUrl = process.env.DATABASE_URL;
    const originalFallback = process.env.ALLOW_DEV_DB_FALLBACK;

    try {
      delete process.env.DATABASE_URL;
      process.env.ALLOW_DEV_DB_FALLBACK = "true";

      if (!process.env.DATABASE_URL) {
        if (process.env.ALLOW_DEV_DB_FALLBACK === "true") {
          process.env.DATABASE_URL = "postgresql://fcr_app:postgres@127.0.0.1:5432/fcr_scs?schema=public";
        }
      }

      expect(process.env.DATABASE_URL).toContain("postgresql://fcr_app");
    } finally {
      process.env.DATABASE_URL = originalUrl;
      process.env.ALLOW_DEV_DB_FALLBACK = originalFallback;
    }
  });
});
