export function validateCreateCompensationReport(body: any): string | null {
  const { caseId, valuationReportId, components } = body;
  if (!caseId) return "caseId is required";
  if (!valuationReportId) return "valuationReportId is required";
  if (!components) return "components object is required";

  const { landValue, buildingValue, cropValue, businessDisruption, disturbanceCompensation, relocationAllowance, otherEligible } = components;
  if (
    landValue === undefined || buildingValue === undefined || cropValue === undefined ||
    businessDisruption === undefined || disturbanceCompensation === undefined ||
    relocationAllowance === undefined || otherEligible === undefined
  ) {
    return "All 7 compensation component values are required";
  }

  if (
    landValue < 0 || buildingValue < 0 || cropValue < 0 ||
    businessDisruption < 0 || disturbanceCompensation < 0 ||
    relocationAllowance < 0 || otherEligible < 0
  ) {
    return "Compensation components must be non-negative numbers";
  }

  return null;
}

export function validateCreateOfferLetter(body: any): string | null {
  const { compensationReportId, caseId, ownershipId, offerAmount } = body;
  if (!compensationReportId) return "compensationReportId is required";
  if (!caseId) return "caseId is required";
  if (!ownershipId) return "ownershipId is required";
  if (offerAmount === undefined || offerAmount <= 0) return "offerAmount must be a positive number";
  return null;
}
