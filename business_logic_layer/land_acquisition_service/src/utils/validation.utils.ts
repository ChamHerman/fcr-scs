export function validateEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

export function validatePhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return "Phone number is required";
  const digits = trimmed.replace(/[\s\-+]/g, "");
  if (!/^\d+$/.test(digits)) return "Phone number must contain only digits, spaces, or hyphens";
  if (!digits.startsWith("01")) return "Phone number must start with 01";
  if (digits.startsWith("011") && digits.length !== 11) return "011 numbers must be 11 digits";
  if (!digits.startsWith("011") && digits.length !== 10) return "01x numbers must be 10 digits";
  return null;
}
