import { describe, it, expect } from "@jest/globals";
import { validateBankAccount, MALAYSIAN_BANKS_CONFIG } from "../services/bank.service";

describe("validateBankAccount - Malaysian 10 Banks Online Format", () => {
  it("validates Maybank (12 digits)", async () => {
    await expect(validateBankAccount("Maybank", "114012345678")).resolves.toEqual({
      valid: true,
      message: expect.any(String),
    });
    await expect(validateBankAccount("Maybank (Malayan Banking Berhad)", "514012345678")).resolves.toEqual({
      valid: true,
      message: expect.any(String),
    });
    // 11 digits or 13 digits should fail
    await expect(validateBankAccount("Maybank", "11401234567")).rejects.toThrow("Invalid account number");
    await expect(validateBankAccount("Maybank", "1140123456789")).rejects.toThrow("Invalid account number");
  });

  it("validates CIMB Bank (10 or 14 digits)", async () => {
    await expect(validateBankAccount("CIMB Bank", "70001234567890")).resolves.toEqual({ valid: true, message: expect.any(String) });
    await expect(validateBankAccount("CIMB Bank Berhad", "8888999901")).resolves.toEqual({ valid: true, message: expect.any(String) });
    await expect(validateBankAccount("CIMB Bank", "123456789")).rejects.toThrow("Invalid account number");
    await expect(validateBankAccount("CIMB Bank", "12345678901")).rejects.toThrow("Invalid account number");
  });

  it("validates Public Bank (10 digits)", async () => {
    await expect(validateBankAccount("Public Bank", "3123456789")).resolves.toEqual({ valid: true, message: expect.any(String) });
    await expect(validateBankAccount("Public Bank", "312345678")).rejects.toThrow("Invalid account number");
    await expect(validateBankAccount("Public Bank", "31234567890")).rejects.toThrow("Invalid account number");
  });

  it("validates RHB Bank (10 or 14 digits)", async () => {
    await expect(validateBankAccount("RHB Bank", "21412345678901")).resolves.toEqual({ valid: true, message: expect.any(String) });
    await expect(validateBankAccount("RHB Bank", "1234567890")).resolves.toEqual({ valid: true, message: expect.any(String) });
    await expect(validateBankAccount("RHB Bank", "123456789012")).rejects.toThrow("Invalid account number");
  });

  it("validates Hong Leong Bank (11 or 13 digits)", async () => {
    await expect(validateBankAccount("Hong Leong Bank", "00100123456")).resolves.toEqual({ valid: true, message: expect.any(String) });
    await expect(validateBankAccount("Hong Leong Bank", "0010012345678")).resolves.toEqual({ valid: true, message: expect.any(String) });
    await expect(validateBankAccount("Hong Leong Bank", "1234567890")).rejects.toThrow("Invalid account number");
  });

  it("validates AmBank (13 digits)", async () => {
    await expect(validateBankAccount("AmBank", "8881001234567")).resolves.toEqual({ valid: true, message: expect.any(String) });
    await expect(validateBankAccount("AmBank", "888100123456")).rejects.toThrow("Invalid account number");
  });

  it("validates Bank Islam (14 digits)", async () => {
    await expect(validateBankAccount("Bank Islam", "12010010012345")).resolves.toEqual({ valid: true, message: expect.any(String) });
    await expect(validateBankAccount("Bank Islam", "1201001001234")).rejects.toThrow("Invalid account number");
  });

  it("validates Affin Bank (10 or 12 digits)", async () => {
    await expect(validateBankAccount("Affin Bank", "100010123456")).resolves.toEqual({ valid: true, message: expect.any(String) });
    await expect(validateBankAccount("Affin Bank", "1000101234")).resolves.toEqual({ valid: true, message: expect.any(String) });
    await expect(validateBankAccount("Affin Bank", "100010123")).rejects.toThrow("Invalid account number");
  });

  it("validates Alliance Bank (12 or 15 digits)", async () => {
    await expect(validateBankAccount("Alliance Bank", "120120010012345")).resolves.toEqual({ valid: true, message: expect.any(String) });
    await expect(validateBankAccount("Alliance Bank", "120120010012")).resolves.toEqual({ valid: true, message: expect.any(String) });
    await expect(validateBankAccount("Alliance Bank", "12012001001")).rejects.toThrow("Invalid account number");
  });

  it("validates OCBC Bank (Malaysia) (10 or 12 digits)", async () => {
    await expect(validateBankAccount("OCBC Bank Malaysia", "7011234567")).resolves.toEqual({ valid: true, message: expect.any(String) });
    await expect(validateBankAccount("OCBC Bank (Malaysia) Berhad", "701123456712")).resolves.toEqual({ valid: true, message: expect.any(String) });
    await expect(validateBankAccount("OCBC Bank", "701123456")).rejects.toThrow("Invalid account number");
  });

  it("rejects non-numeric characters in account number", async () => {
    await expect(validateBankAccount("Maybank", "11401234567A")).rejects.toThrow("must contain only numerical digits");
  });

  it("rejects banks outside the 10 supported Malaysian banks", async () => {
    await expect(validateBankAccount("HSBC Bank", "1234567890")).rejects.toThrow("Unsupported bank");
    await expect(validateBankAccount("Citibank", "1234567890")).rejects.toThrow("Unsupported bank");
  });
});
