export interface BankRule {
  key: string;
  name: string;
  lengths: number[];
  standardLength: number;
  description: string;
  placeholder: string;
}

/**
 * The backend rejects an account number that is already attributed to a
 * different beneficiary (validateAccountNumberUniqueness). That is the one
 * submission failure whose cause IS the account number itself, so it must
 * surface on the Bank Account Number field rather than only in a toast.
 * Matches on "already registered" — the same token the payment and
 * bank-details controllers use to classify that error as a 400, and which
 * appears nowhere else in the backend.
 */
export const isAccountAttributionError = (message?: string | null): boolean =>
  /already registered/i.test(message || '');

export const ACCOUNT_ATTRIBUTION_HINT =
  'This bank account number is already registered under another beneficiary. Please re-enter your own account number, or check it against your bank record.';

export const SUPPORTED_MALAYSIAN_BANKS: BankRule[] = [
  {
    key: 'Maybank',
    name: 'Maybank (Malayan Banking Berhad)',
    lengths: [12],
    standardLength: 12,
    description: '12 digits',
    placeholder: 'e.g. 114012345678',
  },
  {
    key: 'CIMB Bank',
    name: 'CIMB Bank Berhad',
    lengths: [14, 10],
    standardLength: 14,
    description: '14 digits (standard) or 10 digits',
    placeholder: 'e.g. 70001234567890',
  },
  {
    key: 'Public Bank',
    name: 'Public Bank Berhad',
    lengths: [10],
    standardLength: 10,
    description: '10 digits',
    placeholder: 'e.g. 3123456789',
  },
  {
    key: 'RHB Bank',
    name: 'RHB Bank Berhad',
    lengths: [14, 10],
    standardLength: 14,
    description: '14 digits (standard) or 10 digits',
    placeholder: 'e.g. 21412345678901',
  },
  {
    key: 'Hong Leong Bank',
    name: 'Hong Leong Bank Berhad',
    lengths: [11, 13],
    standardLength: 11,
    description: '11 digits (standard) or 13 digits',
    placeholder: 'e.g. 00100123456',
  },
  {
    key: 'AmBank',
    name: 'AmBank (M) Berhad',
    lengths: [13],
    standardLength: 13,
    description: '13 digits',
    placeholder: 'e.g. 8881001234567',
  },
  {
    key: 'Bank Islam',
    name: 'Bank Islam Malaysia Berhad',
    lengths: [14],
    standardLength: 14,
    description: '14 digits',
    placeholder: 'e.g. 12010010012345',
  },
  {
    key: 'Affin Bank',
    name: 'Affin Bank Berhad',
    lengths: [12, 10],
    standardLength: 12,
    description: '12 digits (standard) or 10 digits',
    placeholder: 'e.g. 100010123456',
  },
  {
    key: 'Alliance Bank',
    name: 'Alliance Bank Malaysia Berhad',
    lengths: [15, 12],
    standardLength: 15,
    description: '15 digits (standard) or 12 digits',
    placeholder: 'e.g. 120120010012345',
  },
  {
    key: 'OCBC Bank Malaysia',
    name: 'OCBC Bank (Malaysia) Berhad',
    lengths: [10, 12],
    standardLength: 10,
    description: '10 digits (standard) or 12 digits',
    placeholder: 'e.g. 7011234567',
  },
];

export function getBankRule(bankKey: string): BankRule | undefined {
  if (!bankKey) return undefined;
  const normalized = bankKey.trim().toLowerCase();
  return SUPPORTED_MALAYSIAN_BANKS.find(
    (b) =>
      b.key.toLowerCase() === normalized ||
      b.name.toLowerCase() === normalized ||
      (normalized.includes('ocbc') && b.key === 'OCBC Bank Malaysia') ||
      (normalized.includes('cimb') && b.key === 'CIMB Bank') ||
      (normalized.includes('maybank') && b.key === 'Maybank') ||
      (normalized.includes('public') && b.key === 'Public Bank') ||
      (normalized.includes('rhb') && b.key === 'RHB Bank') ||
      (normalized.includes('hong leong') && b.key === 'Hong Leong Bank') ||
      (normalized.includes('ambank') && b.key === 'AmBank') ||
      (normalized.includes('islam') && b.key === 'Bank Islam') ||
      (normalized.includes('affin') && b.key === 'Affin Bank') ||
      (normalized.includes('alliance') && b.key === 'Alliance Bank')
  );
}

export interface BankValidationStatus {
  isValid: boolean;
  isEmpty: boolean;
  hasNonNumeric: boolean;
  digitsLeft: number;
  currentLength: number;
  targetLength: number;
  isOverLength: boolean;
  statusMessage: string;
  ruleMessage: string;
  cleanedValue: string;
}

export function validateBankAccNumber(bankKey: string, rawInput: string): BankValidationStatus {
  const bank = getBankRule(bankKey);
  const trimmed = (rawInput || '').trim();
  const isEmpty = trimmed.length === 0;

  if (!bank) {
    return {
      isValid: false,
      isEmpty,
      hasNonNumeric: false,
      digitsLeft: 0,
      currentLength: trimmed.length,
      targetLength: 0,
      isOverLength: false,
      statusMessage: 'Please select a valid Malaysian bank institution first.',
      ruleMessage: 'Selection from the 10 approved banks is required.',
      cleanedValue: trimmed,
    };
  }

  const hasNonNumeric = /[^\d\s-]/.test(trimmed);
  const digitsOnly = trimmed.replace(/\D/g, '');
  const currentLength = digitsOnly.length;
  const targetLength = bank.standardLength;
  const isValid = !hasNonNumeric && bank.lengths.includes(currentLength);

  const maxAllowed = Math.max(...bank.lengths);
  const isOverLength = currentLength > maxAllowed;

  // Determine closest required length
  let closestTarget = bank.lengths[0];
  if (bank.lengths.length > 1) {
    const smallerTargets = bank.lengths.filter((l) => l >= currentLength);
    if (smallerTargets.length > 0) {
      closestTarget = Math.min(...smallerTargets);
    } else {
      closestTarget = Math.max(...bank.lengths);
    }
  }

  const digitsLeft = Math.max(0, closestTarget - currentLength);

  let statusMessage = '';
  if (isEmpty) {
    statusMessage = 'Bank account number is required.';
  } else if (hasNonNumeric) {
    statusMessage = 'Invalid character detected. Only numbers (0-9) are allowed.';
  } else if (isOverLength) {
    statusMessage = `Exceeds expected length (${currentLength} digits entered, maximum is ${maxAllowed}).`;
  } else if (!isValid) {
    statusMessage = `${digitsLeft} digit${digitsLeft === 1 ? '' : 's'} left to fulfill ${bank.key} account requirement.`;
  } else {
    statusMessage = `Valid ${bank.key} account number (${currentLength} digits).`;
  }

  const ruleMessage = `${bank.key} requires ${bank.description}.`;

  return {
    isValid,
    isEmpty,
    hasNonNumeric,
    digitsLeft,
    currentLength,
    targetLength: closestTarget,
    isOverLength,
    statusMessage,
    ruleMessage,
    cleanedValue: digitsOnly,
  };
}
