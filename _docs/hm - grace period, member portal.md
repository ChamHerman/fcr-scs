# Implementation Plan: Member Portal 24-Hour Grace Period & Last-Second Cancellation

Provide complete transparency and control to landowners who have accepted a statutory compensation award during the mandatory 24-hour cooling grace period.

## User Review Required

> [!IMPORTANT]
> - **Top Header Fix**: The confusing *"11 days remaining to accept"* text on accepted cases is replaced with a live indicator showing either *"Grace Period Active (Xm remaining)"* or *"Award Accepted (Finalized)"*.
> - **Backend Latency Tolerance**: Server-side grace period check will include a **60-second network latency buffer** (`24h + 60s`) ensuring cancellations submitted with even 10 seconds (or 1 second) remaining succeed without race condition rejections.
> - **Draft Retention**: As agreed, cancelling acceptance keeps the previously uploaded signed Form H available as a pre-filled draft so the member can easily re-accept or replace it.

---

## Proposed Changes

### Presentation Layer (Frontend)

#### [MODIFY] [MemberOfferLetter.tsx](file:///c:/repository/fcr-scs/presentation_layer/src/pages/Member/MemberOfferLetter.tsx)
1. **Live Real-Time Ticking Countdown Hook/State**:
   - Track `now` with `useEffect` interval ticking every 1,000ms.
   - Compute `acceptedAtMs`, `graceEndsAtMs = acceptedAtMs + 24 * 60 * 60 * 1000`, and `remainingMs = Math.max(0, graceEndsAtMs - now)`.
   - Format into clean `HH:MM:SS` (or `MM:SS` when under an hour, e.g., `09m 48s`).
2. **Top Statutory Award Card**:
   - Check if `isOfferAccepted`:
     - If `isWithinGracePeriod`: Display `<Clock size={12} className="text-amber-500 animate-pulse" /> Grace Period Active (HH:MM:SS left)`.
     - If grace period has elapsed: Display `<CheckCircle size={12} className="text-emerald-500" /> Acceptance Finalized`.
     - Only display *"X days remaining to accept"* when the offer is strictly `PENDING`.
3. **Landowner Official Response Card**:
   - In `isOfferAccepted`:
     - If `isWithinGracePeriod`:
       - Show structured Statutory 24-Hour Grace Period banner with:
         - **Offer Accepted Timestamp**: e.g., `13 Sep 2026, 06:41 PM`
         - **Cooling Period Ends**: e.g., `14 Sep 2026, 06:41 PM`
         - **Real-Time Remaining Clock**: pulsing badge with live seconds ticking down.
         - Clear explanation: *"You are within the 24-hour statutory cooling-off grace period. You may withdraw or cancel this acceptance at any time before the window closes."*
         - Prominent **Cancel Acceptance** button (`<XCircle size={16} /> Cancel Acceptance (Grace Period)`).
     - If grace period elapsed (`remainingMs <= 0`):
       - Show finalized acceptance state:
         - Timestamp of when it was accepted and finalized.
         - Call-to-action to proceed with bank details registration (`MemberPaymentStatus`).
         - Gracefully hide/disable cancellation with informative badge: *"Acceptance Finalized (Cooling Period Elapsed)"*.

#### [MODIFY] [useOfferResponse.ts](file:///c:/repository/fcr-scs/presentation_layer/src/pages/Compensation/hooks/useOfferResponse.ts)
- Update `CancelApprovalModal` to display the exact live countdown time remaining so the member knows how much time they have left while confirming.

---

### Business Logic Layer (Backend)

#### [MODIFY] [offer-letter.service.ts](file:///c:/repository/fcr-scs/business_logic_layer/compensation_management_service/src/services/offer-letter.service.ts)
1. **Network Latency Tolerance in `cancelAcceptance`**:
   - Adjust `diffHours` check to include a 60-second grace tolerance:
     ```ts
     const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
     const NETWORK_TOLERANCE_MS = 60 * 1000; // 60s buffer for in-flight requests
     const elapsedMs = now.getTime() - new Date(acceptanceTime).getTime();
     if (elapsedMs > (GRACE_PERIOD_MS + NETWORK_TOLERANCE_MS)) {
       throw new Error("The 24-hour cancellation period has expired. Approvals cannot be cancelled or modified after the cooling grace window.");
     }
     ```
2. **Draft Document Retention on Cancellation**:
   - Retain `signedDocument` on `offerLetter` and `offerMemberResponse` so it remains visible as a draft, but reset `status: OfferStatus.PENDING` and `acceptedAt: null`.
   - Update `acquisitionCase.status = CaseStatus.OFFER_ISSUED`.
   - Soft-delete active payment and blockchain records.

---

## Verification Plan

### Automated / Type-Check Verification
- Run `npx tsc --noEmit` in `business_logic_layer` to ensure backend compile-time safety.
- Run `npx tsc --noEmit` in `presentation_layer` to ensure frontend compile-time safety.

### Manual Verification
- Verify `http://localhost:5173/member/offer-letter?caseId=LAC-2026-08-0015`:
  - Inspect layout, typography, and live seconds ticking.
  - Verify the top card shows the correct status rather than *"11 days remaining to accept"*.
  - Inspect the Landowner Official Response card showing accepted timestamp, grace end timestamp, live timer, and the Cancel button.
