import { prisma } from "../prisma";
import { CaseStatus, ReportStatus, UserRole } from "@prisma/client";

export interface AssignValuerInput {
  caseId: string;
  valuerId: string;
  acceptancePeriodDays?: number;
  remarks?: string;
  assignedById: string;
}

export async function assignValuer(input: AssignValuerInput) {
  const { caseId, valuerId, acceptancePeriodDays = 7, remarks, assignedById } = input;

  // 1. Verify case
  const caseData = await prisma.acquisitionCase.findUnique({
    where: { caseId },
  });
  if (!caseData) throw new Error("Case not found");

  if (caseData.status !== CaseStatus.CASE_REGISTERED) {
    throw new Error(`Cannot assign valuer to case in '${caseData.status}' status. Must be 'CASE_REGISTERED'.`);
  }

  // 2. Verify valuer
  const valuer = await prisma.user.findUnique({
    where: { userId: valuerId },
  });
  if (!valuer || valuer.role !== UserRole.LAND_VALUER || !valuer.isActive) {
    throw new Error("Target user is not an active Land Valuer");
  }

  // 3. Calculate due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + acceptancePeriodDays);

  // 4. Transaction: ValuationReport + CaseAssignment + AcquisitionCase status update
  const result = await prisma.$transaction(async (tx) => {
    // Create ValuationReport placeholder
    const valReport = await tx.valuationReport.create({
      data: {
        caseId,
        valuerId,
        reportStatus: ReportStatus.PENDING,
        createdById: assignedById,
      },
    });

    // Create CaseAssignment link
    const assignment = await tx.caseAssignment.create({
      data: {
        caseId,
        assignedToId: valuerId,
        valuationReportId: valReport.reportId,
        assignmentDate: new Date(),
        dueDate,
        remarks: remarks || "",
        createdById: assignedById,
      },
      include: {
        assignedTo: true,
        acquisitionCase: true,
      },
    });

    // Update case status
    await tx.acquisitionCase.update({
      where: { caseId },
      data: { status: CaseStatus.VALUER_ASSIGNED },
    });

    return assignment;
  });

  return result;
}

export async function getAllAssignments() {
  const assignments = await prisma.caseAssignment.findMany({
    include: {
      acquisitionCase: {
        include: { project: true, landParcel: true },
      },
      assignedTo: true,
      valuationReport: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return assignments;
}
