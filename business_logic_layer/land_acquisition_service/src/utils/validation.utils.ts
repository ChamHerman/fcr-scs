export function validateEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

export function validatePhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return "Phone number is required";
  const digits = trimmed.replace(/[\s\-+]/g, "");
  if (!/^\d+$/.test(digits)) return "Phone number must contain only digits, spaces, or hyphens";
  if (!digits.startsWith("011") && digits.length !== 10) return "01x numbers must be 10 digits";
  return null;
}

const VALID_JPN_STATE_CODES = new Set([
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
  '11', '12', '13', '14', '15', '16', '21', '22', '23', '24',
  '25', '26', '27', '28', '29', '30', '31', '32', '33', '34',
  '35', '36', '37', '38', '39', '40', '41', '42', '43', '44',
  '45', '46', '47', '48', '49', '50', '51', '52', '53', '54',
  '55', '56', '57', '58', '59'
]);

export function validateMalaysianIc(icInput: string | null | undefined): string | null {
  const digits = String(icInput || '').replace(/\D/g, '');
  if (digits.length !== 12) {
    return 'identification number must be exactly 12 digits (e.g. 900101-14-5532)';
  }

  const yyNum = parseInt(digits.slice(0, 2), 10);
  const mm = digits.slice(2, 4);
  const mmNum = parseInt(mm, 10);
  const ddNum = parseInt(digits.slice(4, 6), 10);
  const pb = digits.slice(6, 8);

  if (mmNum < 1 || mmNum > 12) {
    return 'invalid birth month in identification number (must be 01–12)';
  }

  const currentYear = new Date().getFullYear();
  const fullYear = yyNum > (currentYear % 100) ? 1900 + yyNum : 2000 + yyNum;
  const isLeapYear = (fullYear % 4 === 0 && fullYear % 100 !== 0) || (fullYear % 400 === 0);
  const daysInMonths = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDays = daysInMonths[mmNum - 1];

  if (ddNum < 1 || ddNum > maxDays) {
    return `invalid birth day for month ${mm} in identification number (must be 01–${maxDays})`;
  }

  if (!VALID_JPN_STATE_CODES.has(pb)) {
    return `invalid state / place-of-birth code '${pb}' in identification number`;
  }

  return null;
}

