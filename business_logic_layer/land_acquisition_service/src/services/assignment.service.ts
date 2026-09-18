import { prisma } from "../prisma";
import { CaseStatus, ReportStatus, UserRole } from "@prisma/client";
import type { AssignValuerInputDTO as AssignValuerInput } from "../interfaces/assignment.interface";


export async function assignValuer(input: AssignValuerInput) {
  const { caseId, valuerId, acceptancePeriodDays = 7, remarks, assignedById } = input;

  // 1. Verify case
  const caseData = await prisma.acquisitionCase.findUnique({
    where: { caseId },
    include: {
      caseAssignments: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
      valuationReports: true,
    },
  });
  if (!caseData) throw new Error("Case not found");

  const latestAssignment = caseData.caseAssignments?.[0];
  const hasProvidedValuation = Boolean(
    caseData.valuationReports &&
    caseData.valuationReports.length > 0 &&
    caseData.valuationReports.some(
      (r) => r.reportStatus === ReportStatus.PENDING || r.reportStatus === ReportStatus.APPROVED
    )
  );

  const isExpired = latestAssignment?.dueDate ? new Date(latestAssignment.dueDate) < new Date() : false;
  const isInitialAssignment = caseData.status === CaseStatus.CASE_REGISTERED;
  const isValuerAssignedStatus = caseData.status === CaseStatus.VALUER_ASSIGNED;
  const isExpiredWithoutValuation = isExpired && !hasProvidedValuation;

  const canAssignOrReassign = isInitialAssignment || isValuerAssignedStatus || isExpiredWithoutValuation;

  if (!canAssignOrReassign) {
    throw new Error(
      `Cannot assign or reassign valuer to case in '${caseData.status}' status. Reassignment is only permitted when case status is 'VALUER_ASSIGNED' or when the acceptance period has expired without a submitted valuation report.`
    );
  }

  // 2. Verify valuer
  const valuer = await prisma.user.findUnique({
    where: { userId: valuerId },
  });
  if (!valuer || valuer.role !== UserRole.LAND_VALUER || !valuer.isActive) {
    throw new Error("Target user is not an active Land Valuer");
  }

  // 3. Verify Assigner User
  let validAssignerId = assignedById;
  if (validAssignerId) {
    const assigner = await prisma.user.findUnique({
      where: { userId: validAssignerId },
    });
    if (!assigner || !assigner.isActive) {
      throw new Error("Assigning user does not exist or is inactive");
    }

    // Role check: Government Admin & System Admin can assign any case.
    // Government Officer can only assign their own registered cases.
    if (
      assigner.role !== UserRole.GOVERNMENT_ADMINISTRATOR &&
      assigner.role !== UserRole.SYSTEM_ADMINISTRATOR
    ) {
      if (assigner.role === UserRole.GOVERNMENT_OFFICER) {
        if (caseData.createdById !== assigner.userId) {
          throw new Error("Government Officers can only assign land valuers to cases they registered.");
        }
      } else {
        throw new Error("Only Government Administrators and System Administrators can assign land valuers.");
      }
    }
  } else {
    // If no assignedById provided, safely fallback to an active Government Administrator or System Administrator
    const defaultAdmin = await prisma.user.findFirst({
      where: {
        role: { in: [UserRole.GOVERNMENT_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR] },
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
    });
    if (!defaultAdmin) {
      throw new Error("No active Government Administrator found to assign case.");
    }
    validAssignerId = defaultAdmin.userId;
  }

  // 4. Calculate due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + acceptancePeriodDays);

  // 5. Transaction: Soft-delete previous active assignments + CaseAssignment creation + AcquisitionCase status update
  const result = await prisma.$transaction(async (tx) => {
    // Soft-delete any previous active assignments for this case
    await tx.caseAssignment.updateMany({
      where: {
        caseId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    // Create CaseAssignment record (without pre-creating a ValuationReport)
    const assignment = await tx.caseAssignment.create({
      data: {
        caseId,
        assignedToId: valuerId,
        assignmentDate: new Date(),
        dueDate,
        remarks: remarks || "",
        createdById: validAssignerId!,
      },
      include: {
        assignedTo: true,
        acquisitionCase: true,
      },
    });

    // Update case status to VALUER_ASSIGNED
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
    where: { deletedAt: null },
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
