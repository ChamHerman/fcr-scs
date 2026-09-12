import { ValuationInput } from "../interfaces/prediction.types";

const REQUIRED_FEATURES: (keyof ValuationInput)[] = [
  "state",
  "land_category",
  "location_type",
  "tenure_type",
  "land_area_m2",
  "built_up_area_m2",
  "building_age_years",
];

/**
 * Returns an error message when the prediction payload is missing attributes,
 * or null when the payload carries all 7 model features.
 */
export function validateValuationPayload(body: Record<string, unknown>): string | null {
  const missing = REQUIRED_FEATURES.filter((f) => body[f] === undefined || body[f] === "");
  if (missing.length > 0) {
    return `Missing required attributes: ${missing.join(", ")}`;
  }
  return null;
}
