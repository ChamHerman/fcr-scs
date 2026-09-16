process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://fcr_app:postgres@localhost:5432/fcr_scs?schema=public";

import request from "supertest";
import { app } from "../index";
import { UserRole } from "@prisma/client";
import { getTestSessionToken, cleanupTestSessions } from "./testAuthHelper";
import * as paymentService from "../services/payment.service";
import { prisma } from "../prisma";

describe("Payment Controller & RBAC Routes", () => {
  let gaToken: string;
  let sysAdminToken: string;
  let memberToken: string;

  beforeAll(async () => {
    gaToken = await getTestSessionToken(UserRole.GOVERNMENT_ADMINISTRATOR, 1, "ctrl");
    sysAdminToken = await getTestSessionToken(UserRole.SYSTEM_ADMINISTRATOR, 1, "ctrl");
    memberToken = await getTestSessionToken(UserRole.DISPLACED_COMMUNITY_MEMBER, 1, "ctrl");
  });

  afterAll(async () => {
    await cleanupTestSessions("ctrl");
  });

  describe("POST /api/payments/bank-details", () => {
    it("401 when request is unauthenticated", async () => {
      const r = await request(app)
        .post("/api/payments/bank-details")
        .send({ caseId: "CASE-001", bankName: "Maybank" });
      expect(r.status).toBe(401);
    });

    it("400 when caseId is missing", async () => {
      const r = await request(app)
        .post("/api/payments/bank-details")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ bankName: "Maybank" });
      expect(r.status).toBe(400);
    });

    it("400 when bankName is missing", async () => {
      const r = await request(app)
        .post("/api/payments/bank-details")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ caseId: "CASE-001" });
      expect(r.status).toBe(400);
    });

    it("derives the account holder name from the session user, ignoring a spoofed body value", async () => {
      const member = await prisma.user.findUnique({ where: { email: "m1@fcrscs.gov.my" } });
      const submit = jest
        .spyOn(paymentService, "submitBankDetails")
        .mockResolvedValue({ id: "pay-stub", caseId: "CASE-001" } as never);
      const upsert = jest
        .spyOn(prisma.receiverBankDetails, "upsert")
        .mockResolvedValue({} as never);

      await request(app)
        .post("/api/payments/bank-details")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({
          caseId: "CASE-001",
          bankName: "Maybank",
          accountNumber: "114012345678",
          accountHolderName: "Somebody Else",
          myKadNumber: "900101010001",
          phoneNumber: "0123456789",
        });

      expect(submit).toHaveBeenCalledTimes(1);
      expect(submit.mock.calls[0][0].accountHolderName).toBe(member!.name);

      submit.mockRestore();
      upsert.mockRestore();
    });
  });

  describe("POST /api/payments/initiate", () => {
    it("401 when request is unauthenticated", async () => {
      const r = await request(app).post("/api/payments/initiate").send({ caseId: "CASE-001" });
      expect(r.status).toBe(401);
    });

    it("403 when System Administrator attempts initiate (view-only)", async () => {
      const r = await request(app)
        .post("/api/payments/initiate")
        .set("Authorization", `Bearer ${sysAdminToken}`)
        .send({ caseId: "CASE-001" });
      expect(r.status).toBe(403);
      expect(r.body.error).toMatch(/view-only/i);
    });

    it("400 when caseId is missing", async () => {
      const r = await request(app)
        .post("/api/payments/initiate")
        .set("Authorization", `Bearer ${gaToken}`)
        .send({});
      expect(r.status).toBe(400);
      expect(r.body.error).toMatch(/caseId/i);
    });
  });

  describe("POST /api/payments/reject", () => {
    it("400 when reason is missing", async () => {
      const r = await request(app)
        .post("/api/payments/reject")
        .set("Authorization", `Bearer ${gaToken}`)
        .send({ caseId: "CASE-001" });
      expect(r.status).toBe(400);
      expect(r.body.error).toMatch(/reason/i);
    });
  });

  describe("GET /api/payments/status/:caseId", () => {
    it("401 when unauthenticated", async () => {
      const r = await request(app).get("/api/payments/status/NONEXISTENT");
      expect(r.status).toBe(401);
    });

    it("404 for non-existent case with GA token", async () => {
      const r = await request(app)
        .get("/api/payments/status/NONEXISTENT")
        .set("Authorization", `Bearer ${gaToken}`);
      expect(r.status).toBe(404);
    });

    it("404 for non-existent case with System Admin token (read allowed)", async () => {
      const r = await request(app)
        .get("/api/payments/status/NONEXISTENT")
        .set("Authorization", `Bearer ${sysAdminToken}`);
      expect(r.status).toBe(404);
    });
  });

  describe("GET /api/payments/cases/:caseId/receipt", () => {
    it("404 for case with no receipt", async () => {
      const r = await request(app)
        .get("/api/payments/cases/NONEXISTENT/receipt")
        .set("Authorization", `Bearer ${gaToken}`);
      expect(r.status).toBe(404);
    });
  });
});
