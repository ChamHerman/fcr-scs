export function validateCreateCasePayload(body: any): string | null {
  const { project, land, owners, caseTitle } = body;

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

  if (!land.landTitleNo || !land.lotNo || !land.mukim || !land.district || !land.state) {
    return "Land title number, lot number, mukim, district, and state are required";
  }
  if (land.area === undefined || land.area <= 0) {
    return "Land area must be a positive number";
  }
  if (land.latitude === undefined || land.longitude === undefined) {
    return "GPS coordinates (latitude and longitude) are required";
  }

  for (let i = 0; i < owners.length; i++) {
    const owner = owners[i];
    if (!owner.name || !owner.nric || !owner.address || !owner.contact) {
      return `Owner #${i + 1}: name, nric, address, and contact are required`;
    }
  }

  return null;
}
