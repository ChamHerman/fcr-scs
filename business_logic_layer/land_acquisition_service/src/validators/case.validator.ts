import { validateEmail, validatePhone } from "../utils/validation.utils";

export function validateCreateCasePayload(body: any): string | null {
  const { caseId, project, land, owners, caseTitle } = body;

  if (caseId !== undefined && caseId !== null && caseId !== "") {
    if (typeof caseId !== "string" || !/^[A-Za-z0-9\-_]+$/.test(caseId)) {
      return "caseId must be a valid string identifier (e.g. LAC-YYYY-MM-XXXX)";
    }
  }

  if (!project) return "project details are required";
  if (!land) return "land details are required";
  if (!owners || !Array.isArray(owners) || owners.length === 0) return "At least one land owner is required";
  if (!caseTitle) return "caseTitle is required";

  if (!project.projectName || !project.projectType || !project.purpose || !project.fundingSource) {
    return "Project name, type, purpose, and funding source are required";
  }
  if (project.budget === undefined || project.budget <= 0) {
    return "Project budget must be a positive number";
  }

  if (!land.landTitleNo || !land.lotNo || !land.tempat || !land.mukim || !land.district || !land.state || !land.category || !land.tenureType) {
    return "Land title number, land category, tenure type, lot number, tempat, mukim, district, and state are required";
  }
  if (land.area === undefined || land.area <= 0) {
    return "Land area must be a positive number";
  }

  for (let i = 0; i < owners.length; i++) {
    const owner = owners[i];
    if (!owner.name || !owner.nric || !owner.address || !owner.contact || !owner.email || !owner.share) {
      return `Owner #${i + 1}: full name, identification number, address, phone number, email, and ownership share are required`;
    }
    if (!validateEmail(owner.email)) {
      return `Owner #${i + 1}: invalid email format`;
    }
    const phoneErr = validatePhone(owner.contact);
    if (phoneErr) {
      return `Owner #${i + 1}: ${phoneErr}`;
    }
  }

  return null;
}
