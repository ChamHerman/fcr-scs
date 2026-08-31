export interface NricVariants {
  rawNric: string;
  cleanNric: string;
  formattedWithDashes: string;
}

/** Normalises a Malaysian NRIC into three variants for flexible database matching. */
export function normaliseNric(rawInput: string): NricVariants {
  const rawNric = rawInput.trim();
  const cleanNric = rawNric.replace(/[^a-zA-Z0-9]/g, "");
  let formattedWithDashes = rawNric;
  if (cleanNric.length === 12) {
    formattedWithDashes = `${cleanNric.slice(0, 6)}-${cleanNric.slice(6, 8)}-${cleanNric.slice(8)}`;
  }
  return { rawNric, cleanNric, formattedWithDashes };
}

/** Returns a Prisma OR condition array matching all three NRIC variants. */
export function buildNricConditions(rawInput: string) {
  const { rawNric, cleanNric, formattedWithDashes } = normaliseNric(rawInput);
  const conditions: { nric: { contains: string; mode: "insensitive" } }[] = [
    { nric: { contains: rawNric, mode: "insensitive" } },
  ];
  if (cleanNric && cleanNric !== rawNric)
    conditions.push({ nric: { contains: cleanNric, mode: "insensitive" } });
  if (formattedWithDashes && formattedWithDashes !== rawNric && formattedWithDashes !== cleanNric)
    conditions.push({ nric: { contains: formattedWithDashes, mode: "insensitive" } });
  return conditions;
}
