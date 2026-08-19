process.env.ADMIN_WALLET_ADDRESS = "0xAdminWallet123";
process.env.DATABASE_URL = "postgresql://fcr_app:postgres@localhost:5432/fcr_scs?schema=public";
process.env.NODE_ENV = "test";

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import { app } from "../index";
import * as ethereumService from "../services/ethereum.service";

/**
 * Runtime blockchain network switch (admin Settings page):
 *  - GET /network reports the active network
 *  - POST /network { network } switches it (in-memory, resets contract cache)
 *  - unknown network names are rejected
 */
describe("POST /api/smart-contract/network — runtime network switch", () => {
  let original: string;

  beforeAll(async () => {
    original = ethereumService.getActiveNetwork().key;
  });

  afterAll(async () => {
    // Restore the network the suite started on so other tests are unaffected.
    await request(app).post("/api/smart-contract/network").send({ network: original });
  });

  it("GET /network returns the active network with label and chainId", async () => {
    const r = await request(app).get("/api/smart-contract/network");
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("name");
    expect(r.body).toHaveProperty("label");
    expect(typeof r.body.chainId).toBe("number");
  });

  it("POST /network switches to a valid network", async () => {
    const target = original === "mainnet" ? "sepolia" : "mainnet";
    const r = await request(app).post("/api/smart-contract/network").send({ network: target });
    expect(r.status).toBe(200);
    expect(r.body.key).toBe(target);

    const g = await request(app).get("/api/smart-contract/network");
    expect(g.status).toBe(200);
    expect(g.body.name).toBe(target);
  });

  it("400 when network is missing", async () => {
    const r = await request(app).post("/api/smart-contract/network").send({});
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/network/i);
  });

  it("400 for an unknown network name", async () => {
    const r = await request(app).post("/api/smart-contract/network").send({ network: "moonnet" });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/unknown network/i);
  });
});
