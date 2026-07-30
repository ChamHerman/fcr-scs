"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const payment_service_1 = require("../services/payment.service");
describe("calculateRequiredSignatures — multi-sig formula: 1 + floor(amount / 1_000_000)", () => {
    it("returns 1 for amount 0", () => expect((0, payment_service_1.calculateRequiredSignatures)(0)).toBe(1));
    it("returns 1 for amount 999,999", () => expect((0, payment_service_1.calculateRequiredSignatures)(999999)).toBe(1));
    it("returns 2 for amount 1,000,000", () => expect((0, payment_service_1.calculateRequiredSignatures)(1000000)).toBe(2));
    it("returns 2 for amount 1,999,999", () => expect((0, payment_service_1.calculateRequiredSignatures)(1999999)).toBe(2));
    it("returns 3 for amount 2,500,000", () => expect((0, payment_service_1.calculateRequiredSignatures)(2500000)).toBe(3));
    it("returns 6 for amount 5,000,000", () => expect((0, payment_service_1.calculateRequiredSignatures)(5000000)).toBe(6));
});
