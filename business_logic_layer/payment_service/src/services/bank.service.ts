export interface BankConfig {
  key: string;
  name: string;
  aliases: string[];
  lengths: number[];
  standardLength: number;
  description: string;
  example: string;
}

export const MALAYSIAN_BANKS_CONFIG: BankConfig[] = [
  {
    key: "Maybank",
    name: "Maybank (Malayan Banking Berhad)",
    aliases: ["maybank", "malayan banking", "maybank berhad", "malayan banking berhad"],
    lengths: [12],
    standardLength: 12,
    description: "12 digits",
    example: "114012345678",
  },
  {
    key: "CIMB Bank",
    name: "CIMB Bank Berhad",
    aliases: ["cimb", "cimb bank", "cimb bank berhad"],
    lengths: [10, 14],
    standardLength: 14,
    description: "14 digits (standard) or 10 digits",
    example: "70001234567890",
  },
  {
    key: "Public Bank",
    name: "Public Bank Berhad",
    aliases: ["public bank", "public bank berhad", "pbe"],
    lengths: [10],
    standardLength: 10,
    description: "10 digits",
    example: "3123456789",
  },
  {
    key: "RHB Bank",
    name: "RHB Bank Berhad",
    aliases: ["rhb", "rhb bank", "rhb bank berhad"],
    lengths: [10, 14],
    standardLength: 14,
    description: "14 digits (standard) or 10 digits",
    example: "21412345678901",
  },
  {
    key: "Hong Leong Bank",
    name: "Hong Leong Bank Berhad",
    aliases: ["hong leong", "hong leong bank", "hong leong bank berhad", "hlb"],
    lengths: [11, 13],
    standardLength: 11,
    description: "11 digits (standard) or 13 digits",
    example: "00100123456",
  },
  {
    key: "AmBank",
    name: "AmBank (M) Berhad",
    aliases: ["ambank", "ambank berhad", "ambank (m) berhad", "arab-malaysian"],
    lengths: [13],
    standardLength: 13,
    description: "13 digits",
    example: "8881001234567",
  },
  {
    key: "Bank Islam",
    name: "Bank Islam Malaysia Berhad",
    aliases: ["bank islam", "bank islam malaysia", "bank islam malaysia berhad"],
    lengths: [14],
    standardLength: 14,
    description: "14 digits",
    example: "12010010012345",
  },
  {
    key: "Affin Bank",
    name: "Affin Bank Berhad",
    aliases: ["affin", "affin bank", "affin bank berhad", "affin islamic"],
    lengths: [10, 12],
    standardLength: 12,
    description: "12 digits (standard) or 10 digits",
    example: "100010123456",
  },
  {
    key: "Alliance Bank",
    name: "Alliance Bank Malaysia Berhad",
    aliases: ["alliance", "alliance bank", "alliance bank malaysia", "alliance bank malaysia berhad"],
    lengths: [12, 15],
    standardLength: 15,
    description: "15 digits (standard) or 12 digits",
    example: "120120010012345",
  },
  {
    key: "OCBC Bank Malaysia",
    name: "OCBC Bank (Malaysia) Berhad",
    aliases: ["ocbc", "ocbc bank", "ocbc bank malaysia", "ocbc bank (malaysia) berhad"],
    lengths: [10, 12],
    standardLength: 10,
    description: "10 digits (standard) or 12 digits",
    example: "7011234567",
  },
];

export function findBankConfig(bankName: string): BankConfig | undefined {
  if (!bankName) return undefined;
  const normalized = bankName.trim().toLowerCase();
  return MALAYSIAN_BANKS_CONFIG.find(
    (b) =>
      b.key.toLowerCase() === normalized ||
      b.name.toLowerCase() === normalized ||
      b.aliases.some((alias) => alias === normalized || normalized.includes(alias))
  );
}

export async function validateBankAccount(bankName: string, accountNumber: string): Promise<{ valid: boolean; message: string }> {
  if (!bankName || !bankName.trim()) {
    throw new Error("Bank name is required.");
  }

  const bank = findBankConfig(bankName);
  if (!bank) {
    throw new Error(
      `Unsupported bank "${bankName}". Payout accounts must belong to one of the 10 authorized Malaysian commercial banks.`
    );
  }

  if (!accountNumber || !accountNumber.trim()) {
    throw new Error(`Bank account number is required for ${bank.key}.`);
  }

  const rawClean = accountNumber.trim().replace(/[\s-]/g, "");

  // Check numeric only
  if (!/^\d+$/.test(rawClean)) {
    throw new Error(`Bank account number must contain only numerical digits (0-9). Invalid input: "${accountNumber}".`);
  }

  if (!bank.lengths.includes(rawClean.length)) {
    const expected = bank.lengths.join(" or ");
    throw new Error(
      `Invalid account number format for ${bank.name}. Expected ${expected} digits (${bank.description}), but received ${rawClean.length} digits.`
    );
  }

  return {
    valid: true,
    message: `Account number successfully verified for ${bank.name}.`,
  };
}
