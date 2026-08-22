import { CaseStatus } from "@prisma/client";

/**
 * Encapsulates status transition rules for Acquisition Cases.
 */
export class CaseStateMachine {
  private static readonly EDITABLE_STATUSES: CaseStatus[] = [
    CaseStatus.CASE_REGISTERED,
    CaseStatus.VALUER_ASSIGNED,
  ];

  private static readonly ACTIVE_STATUSES: CaseStatus[] = [
    CaseStatus.CASE_REGISTERED,
    CaseStatus.VALUER_ASSIGNED,
    CaseStatus.VALUATION_IN_PROGRESS,
    CaseStatus.PENDING_VALUATION_APPROVAL,
    CaseStatus.VALUATION_APPROVED,
    CaseStatus.PENDING_COMPENSATION_APPROVAL,
    CaseStatus.COMPENSATION_APPROVED,
    CaseStatus.OFFER_ISSUED,
    CaseStatus.OFFER_ACCEPTED,
    CaseStatus.PAYMENT_IN_PROGRESS,
  ];

  private static readonly COMPLETED_STATUSES: CaseStatus[] = [
    CaseStatus.PAYMENT_COMPLETED,
    CaseStatus.CASE_CLOSED,
  ];

  private static readonly PENDING_ACTION_STATUSES: CaseStatus[] = [
    CaseStatus.PENDING_VALUATION_APPROVAL,
    CaseStatus.PENDING_COMPENSATION_APPROVAL,
  ];

  public static isEditable(status: CaseStatus): boolean {
    return this.EDITABLE_STATUSES.includes(status);
  }

  public static isActive(status: CaseStatus): boolean {
    return this.ACTIVE_STATUSES.includes(status);
  }

  public static isCompleted(status: CaseStatus): boolean {
    return this.COMPLETED_STATUSES.includes(status);
  }

  public static isPendingAction(status: CaseStatus): boolean {
    return this.PENDING_ACTION_STATUSES.includes(status);
  }

  public static canDelete(status: CaseStatus): boolean {
    return status === CaseStatus.CASE_REGISTERED;
  }

  public static canAssignValuer(status: CaseStatus): boolean {
    return status === CaseStatus.CASE_REGISTERED;
  }

  public static canSubmitValuation(status: CaseStatus): boolean {
    const allowed: CaseStatus[] = [
      CaseStatus.VALUER_ASSIGNED,
      CaseStatus.VALUATION_IN_PROGRESS,
      CaseStatus.VALUATION_REJECTED,
    ];
    return allowed.includes(status);
  }

  public static canCreateCompensation(status: CaseStatus): boolean {
    const allowed: CaseStatus[] = [
      CaseStatus.VALUATION_APPROVED,
      CaseStatus.COMPENSATION_REJECTED,
    ];
    return allowed.includes(status);
  }
}
