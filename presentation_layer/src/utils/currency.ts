/**
 * Currency utility functions for live formatting, decimal normalization,
 * numeric parsing, and cursor position preservation.
 */

/**
 * Strips all non-digit and non-decimal characters.
 */
export const cleanCurrencyString = (val: string): string => {
  return val.replace(/[^\d.]/g, "");
};

/**
 * Live formats user input as they type:
 * - Adds thousand separators (commas) to the integer portion.
 * - Preserves decimal point and allows up to 2 decimal places.
 * - Strips leading redundant zeros (except single 0 or 0.xx).
 */
export const formatLiveCurrency = (input: string): string => {
  if (!input) return "";

  // Remove everything except digits and dot
  const clean = input.replace(/[^\d.]/g, "");
  if (!clean) return "";

  const parts = clean.split(".");
  let integerPart = parts[0] || "";

  // Normalize leading zeros: e.g. "05" -> "5", "00" -> "0"
  if (integerPart.length > 1 && integerPart.startsWith("0")) {
    integerPart = integerPart.replace(/^0+/, "") || "0";
  }

  // If user typed dot first (e.g. ".5"), treat integer part as "0"
  if (!integerPart && parts.length > 1) {
    integerPart = "0";
  }

  // Format integer with thousand commas
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // If there is a decimal point
  if (parts.length > 1) {
    const decimalPart = parts.slice(1).join("").slice(0, 2);
    return `${formattedInteger}.${decimalPart}`;
  }

  return formattedInteger;
};

/**
 * Normalizes a currency value to fixed 2 decimal places with thousand separators (e.g. on blur or initial load).
 * Example: "1000" -> "1,000.00", 1234.5 -> "1,234.50", "" -> ""
 */
export const formatCurrencyWithDecimals = (
  val: string | number | null | undefined
): string => {
  if (val === null || val === undefined || val === "") return "";
  const clean = String(val).replace(/,/g, "").trim();
  if (!clean || isNaN(Number(clean))) return "";
  const num = parseFloat(clean);
  if (isNaN(num)) return "";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

/**
 * Parses any formatted currency string or number to a clean float number.
 * Example: "1,500,000.50" -> 1500000.5
 */
export const parseCurrencyToNumber = (
  val: string | number | null | undefined
): number => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const clean = String(val).replace(/,/g, "").trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

/**
 * Formats a currency value with Malaysian Ringgit prefix (e.g., "RM 1,500,000.00").
 */
export const formatCurrencyRM = (
  val: number | string | null | undefined
): string => {
  const formatted = formatCurrencyWithDecimals(val);
  return formatted ? `RM ${formatted}` : "RM 0.00";
};

/**
 * Calculates the exact target cursor position in the formatted string
 * based on how many non-separator (raw) characters existed before the cursor
 * in the unformatted input.
 *
 * This prevents the cursor from jumping to the end of the input field when commas are added/removed.
 */
export const calculateCursorPosition = (
  rawVal: string,
  selectionStart: number,
  formattedVal: string
): number => {
  // Count non-comma characters before cursor in the raw typed value
  const rawCharsBeforeCursor = rawVal
    .slice(0, selectionStart)
    .replace(/,/g, "").length;

  if (rawCharsBeforeCursor <= 0) return 0;

  // Find corresponding index in the new formatted string
  let countedRaw = 0;
  let targetCursor = formattedVal.length;

  for (let i = 0; i < formattedVal.length; i++) {
    if (countedRaw >= rawCharsBeforeCursor) {
      targetCursor = i;
      break;
    }
    if (formattedVal[i] !== ",") {
      countedRaw++;
    }
    if (countedRaw >= rawCharsBeforeCursor) {
      targetCursor = i + 1;
      break;
    }
  }

  return targetCursor;
};
