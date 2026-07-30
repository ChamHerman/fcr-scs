"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://fcr_app:postgres@localhost:5432/fcr_scs?schema=public";
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../index");
describe("POST /api/payments/bank-details", () => {
    it("400 when caseId is missing", async () => {
        const r = await (0, supertest_1.default)(index_1.app).post("/api/payments/bank-details").send({ bankName: "Maybank" });
        expect(r.status).toBe(400);
    });
    it("400 when bankName is missing", async () => {
        const r = await (0, supertest_1.default)(index_1.app).post("/api/payments/bank-details").send({ caseId: "CASE-001" });
        expect(r.status).toBe(400);
    });
});
describe("POST /api/payments/initiate", () => {
    it("400 when adminId is missing", async () => {
        const r = await (0, supertest_1.default)(index_1.app).post("/api/payments/initiate").send({ caseId: "CASE-001" });
        expect(r.status).toBe(400);
    });
});
describe("POST /api/payments/reject", () => {
    it("400 when reason is missing", async () => {
        const r = await (0, supertest_1.default)(index_1.app).post("/api/payments/reject").send({ caseId: "CASE-001", adminId: "a1" });
        expect(r.status).toBe(400);
        expect(r.body.error).toMatch(/reason/i);
    });
});
describe("GET /api/payments/status/:caseId", () => {
    it("404 for non-existent case", async () => {
        const r = await (0, supertest_1.default)(index_1.app).get("/api/payments/status/NONEXISTENT");
        expect(r.status).toBe(404);
    });
});
describe("GET /api/payments/receipt/:caseId", () => {
    it("404 for case with no receipt", async () => {
        const r = await (0, supertest_1.default)(index_1.app).get("/api/payments/receipt/NONEXISTENT");
        expect(r.status).toBe(404);
    });
});
