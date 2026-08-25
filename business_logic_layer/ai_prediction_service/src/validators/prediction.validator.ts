import { ValuationInput } from "../interfaces/prediction.types";

const REQUIRED_FEATURES: (keyof ValuationInput)[] = [
  "state",
  "land_category",
  "location_type",
  "tenure_type",
  "building_condition",
  "land_area_sqft",
  "built_up_area_sqft",
  "building_age_years",
];

/**
 * Returns an error message when the prediction payload is missing attributes,
 * or null when the payload carries all 8 model features.
 */
export function validateValuationPayload(body: Record<string, unknown>): string | null {
  const missing = REQUIRED_FEATURES.filter((f) => body[f] === undefined || body[f] === "");
  if (missing.length > 0) {
    return `Missing required attributes: ${missing.join(", ")}`;
  }
  return null;
}
