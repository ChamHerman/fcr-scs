import { LandCategory, TenureType, OwnershipType } from "@prisma/client";

export function parseLandCategory(val?: string | null): LandCategory {
  if (!val) return LandCategory.AGRICULTURE;
  const u = val.toUpperCase().trim();
  if (u.includes("BUILD")) return LandCategory.BUILDING;
  if (u.includes("INDUS")) return LandCategory.INDUSTRY;
  return LandCategory.AGRICULTURE;
}

export function parseTenureType(val?: string | null): TenureType {
  if (!val) return TenureType.FREEHOLD;
  const u = val.toUpperCase().trim();
  if (u.includes("LEASE")) return TenureType.LEASEHOLD;
  if (u.includes("MALAY") || u.includes("RESERVE")) return TenureType.MALAY_RESERVE;
  return TenureType.FREEHOLD;
}

export function parseOwnershipType(val?: string | null): OwnershipType {
  if (!val) return OwnershipType.INDIVIDUAL_CITIZEN;
  const u = val.toUpperCase().trim();
  if (u.includes("JOINT")) return OwnershipType.JOINT_OWNERSHIP;
  if (u.includes("CORP")) return OwnershipType.CORPORATE_ENTITY;
  if (u.includes("DECEASED")) return OwnershipType.ESTATE_OF_DECEASED;
  if (u.includes("TRUST")) return OwnershipType.TRUSTEE;
  return OwnershipType.INDIVIDUAL_CITIZEN;
}

export function formatOwnershipType(val?: OwnershipType | string | null): string {
  if (!val) return "Individual Citizen";
  const u = String(val).toUpperCase().trim();
  if (u.includes("JOINT")) return "Joint Ownership";
  if (u.includes("CORP")) return "Corporate Entity";
  if (u.includes("DECEASED")) return "Estate of Deceased";
  if (u.includes("TRUST")) return "Trustee";
  return "Individual Citizen";
}
