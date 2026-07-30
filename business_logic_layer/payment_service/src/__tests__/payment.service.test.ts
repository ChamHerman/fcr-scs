import { calculateRequiredSignatures } from "../services/payment.service";

describe("calculateRequiredSignatures — multi-sig formula: 1 + floor(amount / 1_000_000)", () => {
  it("returns 1 for amount 0", () => expect(calculateRequiredSignatures(0)).toBe(1));
  it("returns 1 for amount 999,999", () => expect(calculateRequiredSignatures(999_999)).toBe(1));
  it("returns 2 for amount 1,000,000", () => expect(calculateRequiredSignatures(1_000_000)).toBe(2));
  it("returns 2 for amount 1,999,999", () => expect(calculateRequiredSignatures(1_999_999)).toBe(2));
  it("returns 3 for amount 2,500,000", () => expect(calculateRequiredSignatures(2_500_000)).toBe(3));
  it("returns 6 for amount 5,000,000", () => expect(calculateRequiredSignatures(5_000_000)).toBe(6));
});
