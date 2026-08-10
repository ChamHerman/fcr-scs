import { prisma } from "../prisma";

export async function compareCases(caseIds: string[]) {
  if (!caseIds || caseIds.length < 2) {
    throw new Error("At least two case IDs are required for comparison");
  }

  const cases = await prisma.acquisitionCase.findMany({
    where: {
      caseId: { in: caseIds },
    },
    include: {
      project: true,
      landParcel: {
        include: {
          ownerships: { include: { landOwner: true } },
        },
      },
      valuationReports: {
        include: { valuer: true },
        orderBy: { createdAt: "desc" },
      },
      compensationReports: {
        orderBy: { createdAt: "desc" },
      },
      offerLetters: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const comparisonData = cases.map((c) => {
    const latestValuation = c.valuationReports[0];
    const latestCompensation = c.compensationReports[0];
    const latestOffer = c.offerLetters[0];

    return {
      caseId: c.caseId,
      caseTitle: c.caseTitle,
      status: c.status,
      projectName: c.project?.projectName || "—",
      projectType: c.project?.projectType || "—",
      landTitleNo: c.landParcel?.landTitleNo || "—",
      landArea: c.landParcel?.area ? `${c.landParcel.area} ${c.landParcel.areaUnit}` : "—",
      district: c.landParcel?.district || "—",
      owners: c.landParcel?.ownerships.map((o) => o.landOwner.name) || [],
      marketValue: latestValuation?.marketValue ? Number(latestValuation.marketValue) : null,
      valuationMethod: latestValuation?.valuationMethod || "—",
      valuerName: latestValuation?.valuer?.name || "—",
      totalCompensation: latestCompensation?.totalCompensation ? Number(latestCompensation.totalCompensation) : null,
      offerAmount: latestOffer?.offerAmount ? Number(latestOffer.offerAmount) : null,
      offerStatus: latestOffer?.status || "—",
    };
  });

  return comparisonData;
}
