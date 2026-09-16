process.env.ADMIN_WALLET_ADDRESS = "0xAdminWallet123";
process.env.DATABASE_URL = "postgresql://fcr_app:postgres@localhost:5432/fcr_scs?schema=public";
process.env.NODE_ENV = "test";

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import { UserRole } from "@prisma/client";
import { app } from "../index";
import { getTestSessionToken, cleanupTestSessions, closeTestDb } from "./testAuthHelper";

let gaToken: string;

beforeAll(async () => {
  gaToken = await getTestSessionToken(UserRole.GOVERNMENT_ADMINISTRATOR, 1, "bcn");
});

afterAll(async () => {
  await cleanupTestSessions("bcn");
  await closeTestDb();
});

describe("POST /api/smart-contract/publish — input validation", () => {
  it("401 when unauthenticated", async () => {
    const r = await request(app).post("/api/smart-contract/publish")
      .send({ caseId: "CASE-001", documentHash: "0xabc", transactionHash: "0xtx", walletAddress: "0xAdminWallet123" });
    expect(r.status).toBe(401);
  });

  it("400 when caseId is missing", async () => {
    const r = await request(app).post("/api/smart-contract/publish")
      .set("Authorization", `Bearer ${gaToken}`)
      .send({ documentHash: "0xabc", transactionHash: "0xtx", walletAddress: "0xAdminWallet123" });
    expect(r.status).toBe(400);
  });
  it("400 when documentHash is missing", async () => {
    const r = await request(app).post("/api/smart-contract/publish")
      .set("Authorization", `Bearer ${gaToken}`)
      .send({ caseId: "CASE-001", transactionHash: "0xtx", walletAddress: "0xAdminWallet123" });
    expect(r.status).toBe(400);
  });
  it("400 when transactionHash is missing (tx must be sent from MetaMask first)", async () => {
    const r = await request(app).post("/api/smart-contract/publish")
      .set("Authorization", `Bearer ${gaToken}`)
      .send({ caseId: "CASE-001", documentHash: "0xabc", walletAddress: "0xAdminWallet123" });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/transactionHash/i);
  });
  it("403 when wallet address does not match", async () => {
    const r = await request(app).post("/api/smart-contract/publish")
      .set("Authorization", `Bearer ${gaToken}`)
      .send({ caseId: "CASE-001", documentHash: "0xabc", transactionHash: "0xtx", walletAddress: "0xWRONG" });
    expect(r.status).toBe(403);
    expect(r.body.error).toMatch(/unauthorised/i);
  });
});


describe("POST /api/smart-contract/verify — input validation", () => {
  it("400 when no file uploaded", async () => {
    const r = await request(app).post("/api/smart-contract/verify");
    expect(r.status).toBe(400);
  });
  it("400 for non-PDF file", async () => {
    const r = await request(app).post("/api/smart-contract/verify")
      .attach("file", Buffer.from("text"), { filename: "t.txt", contentType: "text/plain" });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/pdf/i);
  });
});

describe("GET /api/smart-contract/records/:caseId", () => {
  it("404 for unknown caseId", async () => {
    const r = await request(app).get("/api/smart-contract/records/NONEXISTENT-999");
    expect(r.status).toBe(404);
  });
  it("404 for unknown caseId with milestone M2 query", async () => {
    const r = await request(app).get("/api/smart-contract/records/NONEXISTENT-999?milestone=M2");
    expect(r.status).toBe(404);
  });
});

describe("POST /api/smart-contract/publish — dual milestone handling", () => {
  it("accepts milestone M2 in payload and enforces wallet auth", async () => {
    const r = await request(app).post("/api/smart-contract/publish")
      .set("Authorization", `Bearer ${gaToken}`)
      .send({ caseId: "CASE-002", milestone: "M2", documentHash: "0xabc", transactionHash: "0xtx", walletAddress: "0xWRONG" });
    expect(r.status).toBe(403);
    expect(r.body.error).toMatch(/unauthorised/i);
  });
});


