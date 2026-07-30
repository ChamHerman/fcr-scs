"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBankAccount = validateBankAccount;
async function validateBankAccount(_bankName, _accountNumber) {
    // Simulated — always valid in dev. Replace with real banking API in production.
    return { valid: true, message: "Account validated" };
}
