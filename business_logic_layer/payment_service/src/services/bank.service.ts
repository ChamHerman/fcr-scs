export async function validateBankAccount(_bankName: string, _accountNumber: string) {
  // Simulated — always valid in dev. Replace with real banking API in production.
  return { valid: true, message: "Account validated" };
}
