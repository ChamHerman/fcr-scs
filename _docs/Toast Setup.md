# Toast Setup – Implementation Plan

## Overview

Currently, every success, error, and validation message in the `LandAcquisition` and
`Compensation` pages is delivered via the browser's native **`window.alert()`** popup.
These are blocking, unstyled, and freeze the tab until the user clicks "OK" — a poor UX
for a production system.

The goal of this plan is to **replace every `alert()` call** in those two page folders
with the existing `NotificationSystem` toast component that slides in from the **top-right
corner** of the screen, auto-dismisses after 3 seconds, and matches the project's design
system.

---

## Is `NotificationSystem.tsx` Already a Toast Bar?

**Yes.** The existing
`presentation_layer/src/components/ui/NotificationSystem.tsx` is already a fully
functioning top-right toast system:

| Feature | Detail |
|---|---|
| Position | Fixed — `top-6 right-6` (top-right corner) |
| Animation | GSAP slide-in from right on appear, slide-out on dismiss |
| Auto-dismiss | 3 seconds after mounting |
| Manual dismiss | X button on each toast |
| Types | `success` (green), `error` (red), `general` (yellow/warning) |
| Hook | `useNotification()` — call `notify({ type, title, message? })` |
| Provider | `<NotificationProvider>` already wrapping the entire app in `main.tsx` |

> **No new component needs to be created.** The existing `NotificationSystem.tsx` is
> the correct tool for the job. All pages just need to import and call it.

---

## Affected Files — Complete Audit

### LandAcquisition (8 files with `alert()` calls)

| File | `alert()` Count | Scenarios |
|---|---|---|
| `CaseAssignment.tsx` | 5 | Access denied, no case selected, no valuer selected, invalid period, assignment failed |
| `CaseDashboard.tsx` | 2 | Access denied (admin-only), valuer assigned successfully |
| `CaseDetails.tsx` | 1 | Delete failed |
| `CaseEdit.tsx` | 3 | No new docs selected (validation), case updated successfully, update failed |
| `CaseRegistration.tsx` | 2 | Registered successfully, registration failed |
| `ValuationReportDashboard.tsx` | 1 | Access denied (land valuers only) |
| `ValuationReportGenerator.tsx` | 3 | No case selected (x2), report save failed |
| `ValuationReportReview.tsx` | 7 | Approve access denied, approved OK, approve failed, reject access denied (x2), rejected OK, reject failed |

**Total LandAcquisition: ~24 `alert()` calls across 8 files**

---

### Compensation (8 files with `alert()` calls)

| File | `alert()` Count | Scenarios |
|---|---|---|
| `ComparisonCreation.tsx` | 1 | Please select two different cases |
| `ComparisonDashboard.tsx` | 3 | Select two cases, select two different cases, comparison failed |
| `CompensationReportGenerator.tsx` | 3 | Generation failed, calculate first, dismiss warning first |
| `CompensationReportList.tsx` | 2 | Admin cannot create, officer-only access |
| `CompensationReview.tsx` | 4 | Admin approve only, approve failed, admin reject only, reject failed |
| `ObjectionCreation.tsx` | 3 | File too large, invalid offer, submission failed |
| `ObjectionDashboard.tsx` | 4 | Role denied, amount must be > 0, update failed, delete failed |
| `ObjectionReview.tsx` | 10 | Role denied (x2), amount > 0, approve OK, approve failed, reject denied (x2), reject failed, update failed, delete failed |
| `OfferLetterReview.tsx` | ~10 | Accept check, accept OK (multi-owner), accept failed, cancel approval OK/failed, withdraw role, withdraw failed, reject role, reject failed |

**Total Compensation: ~37 `alert()` calls across 9 files**

---

**Grand Total: ~61 `alert()` calls across 16 files**

---

## Toast Type Mapping

Each `alert()` call maps to one of the three notification types:

| Scenario | Toast Type | Title Example |
|---|---|---|
| Operation succeeded | `success` | "Case Registered", "Approved", "Assigned" |
| Operation failed / API error | `error` | "Registration Failed", "Approve Failed" |
| Role/permission denied | `error` | "Access Denied" |
| Validation (missing field) | `general` | "Selection Required", "Invalid Input" |
| Warning / info | `general` | "Action Required" |

---

## Implementation Steps

### Step 1 — Verify Provider is Wired (Already Done)

`NotificationProvider` is already imported and wrapping `<App />` in `main.tsx`.
No changes needed at the app root level.

```tsx
// main.tsx (already in place — no changes needed)
import { NotificationProvider } from './components/ui/NotificationSystem';

<NotificationProvider>
  <App />
</NotificationProvider>
```

---

### Step 2 — Update Each File

For **every** affected file, make these two changes:

#### 2a. Add the import at the top of the file

```tsx
import { useNotification } from '../../components/ui/NotificationSystem';
```
> Adjust the relative path based on the file location.

#### 2b. Destructure the hook inside the component function

```tsx
const { notify } = useNotification();
```

#### 2c. Replace each `alert(...)` with `notify(...)`

**Pattern for success:**
```tsx
// Before
alert("Case Registered Successfully!\n\nCase ID: " + newCaseId);

// After
notify({
  type: 'success',
  title: 'Case Registered',
  message: `Case ID: ${newCaseId} — Status: Case Registered`,
});
```

**Pattern for error:**
```tsx
// Before
alert(`Registration Failed: ${err.message || "Could not reach backend"}`);

// After
notify({
  type: 'error',
  title: 'Registration Failed',
  message: err.message || 'Could not reach backend',
});
```

**Pattern for access denied / validation:**
```tsx
// Before
alert("Only Government Administrators can assign land valuers.");

// After
notify({
  type: 'error',
  title: 'Access Denied',
  message: 'Only Government Administrators can assign land valuers.',
});
```

**Pattern for general/warning:**
```tsx
// Before
alert("Please select a case before generating the report.");

// After
notify({
  type: 'general',
  title: 'Selection Required',
  message: 'Please select a case before generating the report.',
});
```

---

### Step 3 — File-by-File Detailed Replacements

#### `LandAcquisition/CaseAssignment.tsx`

| Line | Current `alert()` | New `notify()` |
|---|---|---|
| 127 | Access Denied — admin only | `type: 'error'`, title: `'Access Denied'` |
| 131 | Please select a case | `type: 'general'`, title: `'No Case Selected'` |
| 135 | Please select a land valuer | `type: 'general'`, title: `'No Valuer Selected'` |
| 139 | Please enter a valid acceptance period | `type: 'general'`, title: `'Invalid Period'` |
| 175 | Assignment Failed | `type: 'error'`, title: `'Assignment Failed'` |

#### `LandAcquisition/CaseDashboard.tsx`

| Line | Current `alert()` | New `notify()` |
|---|---|---|
| 127 | Admin-only access | `type: 'error'`, title: `'Access Denied'` |
| 178 | Land Valuer assigned successfully | `type: 'success'`, title: `'Valuer Assigned'` |

#### `LandAcquisition/CaseDetails.tsx`

| Line | Current `alert()` | New `notify()` |
|---|---|---|
| 246 | Delete Failed | `type: 'error'`, title: `'Delete Failed'` |

#### `LandAcquisition/CaseEdit.tsx`

| Line | Current `alert()` | New `notify()` |
|---|---|---|
| 207 | No new documents selected | `type: 'general'`, title: `'No File Selected'` |
| 233 | Case updated successfully | `type: 'success'`, title: `'Case Updated'` |
| 239 | Update Failed | `type: 'error'`, title: `'Update Failed'` |

#### `LandAcquisition/CaseRegistration.tsx`

| Line | Current `alert()` | New `notify()` |
|---|---|---|
| 93 | Case Registered Successfully | `type: 'success'`, title: `'Case Registered'` |
| 97 | Registration Failed | `type: 'error'`, title: `'Registration Failed'` |

#### `LandAcquisition/ValuationReportDashboard.tsx`

| Line | Current `alert()` | New `notify()` |
|---|---|---|
| 151 | Only Land Valuers can create | `type: 'error'`, title: `'Access Denied'` |

#### `LandAcquisition/ValuationReportGenerator.tsx`

| Line | Current `alert()` | New `notify()` |
|---|---|---|
| 188 | Please select a case first | `type: 'general'`, title: `'No Case Selected'` |
| 219 | No case selected | `type: 'general'`, title: `'No Case Selected'` |
| 276 | Report Save Failed | `type: 'error'`, title: `'Save Failed'` |

#### `LandAcquisition/ValuationReportReview.tsx`

| Line | Current `alert()` | New `notify()` |
|---|---|---|
| 114 | Only case creator can approve | `type: 'error'`, title: `'Access Denied'` |
| 119 | Valuation Report Approved | `type: 'success'`, title: `'Report Approved'` |
| 123 | Approval Failed | `type: 'error'`, title: `'Approval Failed'` |
| 129 | Only case creator can reject | `type: 'error'`, title: `'Access Denied'` |
| 145 | Only case creator can reject | `type: 'error'`, title: `'Access Denied'` |
| 166 | Valuation Report Rejected | `type: 'success'`, title: `'Report Rejected'` |
| 171 | Rejection Failed | `type: 'error'`, title: `'Rejection Failed'` |

---

#### `Compensation/ComparisonCreation.tsx`

| Line | Current `alert()` | New `notify()` |
|---|---|---|
| 197 | Please select two different cases | `type: 'general'`, title: `'Invalid Selection'` |

#### `Compensation/ComparisonDashboard.tsx`

| Line | Current `alert()` | New `notify()` |
|---|---|---|
| 42 | Please select two cases | `type: 'general'`, title: `'Selection Required'` |
| 46 | Select two different cases | `type: 'general'`, title: `'Invalid Selection'` |
| 56 | Comparison Failed | `type: 'error'`, title: `'Comparison Failed'` |

#### `Compensation/CompensationReportGenerator.tsx`

| Line | Current `alert()` | New `notify()` |
|---|---|---|
| 215 | Report Generation Failed | `type: 'error'`, title: `'Generation Failed'` |
| 223 | Please calculate compensation first | `type: 'general'`, title: `'Action Required'` |
| 227 | Please dismiss the warning first | `type: 'general'`, title: `'Action Required'` |

#### `Compensation/CompensationReportList.tsx`

| Line | Current `alert()` | New `notify()` |
|---|---|---|
| 128 | Admins cannot create compensation reports | `type: 'error'`, title: `'Access Denied'` |
| 132 | Only Officers can create reports | `type: 'error'`, title: `'Access Denied'` |

#### `Compensation/CompensationReview.tsx`

| Line | Current `alert()` | New `notify()` |
|---|---|---|
| 147 | Only Admins can approve | `type: 'error'`, title: `'Access Denied'` |
| 175 | Approval Failed | `type: 'error'`, title: `'Approval Failed'` |
| 188 | Only Admins can reject | `type: 'error'`, title: `'Access Denied'` |
| 199 | Rejection Failed | `type: 'error'`, title: `'Rejection Failed'` |

#### `Compensation/ObjectionCreation.tsx`

| Line | Current `alert()` | New `notify()` |
|---|---|---|
| 111 | File size exceeds 10MB | `type: 'error'`, title: `'File Too Large'` |
| 154 | Invalid offer selected | `type: 'error'`, title: `'Invalid Selection'` |
| 174 | Submission failed | `type: 'error'`, title: `'Submission Failed'` |

#### `Compensation/ObjectionDashboard.tsx`

| Line | Current `alert()` | New `notify()` |
|---|---|---|
| 219 | Only Community Members can submit | `type: 'error'`, title: `'Access Denied'` |
| 234 | Requested amount must be > 0 | `type: 'general'`, title: `'Invalid Amount'` |
| 247 | Update failed | `type: 'error'`, title: `'Update Failed'` |
| 262 | Delete failed | `type: 'error'`, title: `'Delete Failed'` |

#### `Compensation/ObjectionReview.tsx`

| Line | Current `alert()` | New `notify()` |
|---|---|---|
| 142 | Admins cannot approve/reject objections | `type: 'error'`, title: `'Access Denied'` |
| 146 | Only assigned Officer can approve | `type: 'error'`, title: `'Access Denied'` |
| 173 | Objection approved, offer updated | `type: 'success'`, title: `'Objection Approved'` |
| 176 | Approve failed | `type: 'error'`, title: `'Approval Failed'` |
| 185 | Admins cannot approve/reject | `type: 'error'`, title: `'Access Denied'` |
| 189 | Only assigned Officer can reject | `type: 'error'`, title: `'Access Denied'` |
| 216 | Reject failed | `type: 'error'`, title: `'Rejection Failed'` |
| 232 | Requested amount must be > 0 | `type: 'general'`, title: `'Invalid Amount'` |
| 253 | Update failed | `type: 'error'`, title: `'Update Failed'` |
| 267 | Delete failed | `type: 'error'`, title: `'Delete Failed'` |

#### `Compensation/OfferLetterReview.tsx`

| Line | Current `alert()` | New `notify()` |
|---|---|---|
| 291 | Ownership/accept check | `type: 'error'`, title: `'Access Denied'` |
| 307 | Accept success (multi-owner messaging) | `type: 'success'`, title: `'Offer Accepted'` |
| 348 | Accept Failed | `type: 'error'`, title: `'Accept Failed'` |
| 358 | Only owners can cancel approval | `type: 'error'`, title: `'Access Denied'` |
| 370 | Approval cancelled | `type: 'success'`, title: `'Approval Cancelled'` |
| 373 | Cancellation failed | `type: 'error'`, title: `'Cancellation Failed'` |
| 382 | Only owners can perform this action | `type: 'error'`, title: `'Access Denied'` |
| 394 | Could not withdraw objection | `type: 'error'`, title: `'Withdrawal Failed'` |
| 407 | Reject role check | `type: 'error'`, title: `'Access Denied'` |
| 423 | Reject Failed | `type: 'error'`, title: `'Rejection Failed'` |

---

## No New Component Required

The `NotificationSystem.tsx` already handles everything needed:
- Top-right fixed positioning
- Animated slide-in/out (GSAP)
- Auto-dismiss (3 seconds)
- Manual dismiss (X button)
- Three types: `success`, `error`, `general`
- Provider already mounted globally in `main.tsx`

---

## Verification Plan

After completing all replacements:

1. **No `alert(` remaining** — run a final grep search in both folders to confirm zero results.
2. **Success flow** — trigger a successful action (e.g., register a case) and confirm a green toast appears top-right.
3. **Error flow** — trigger an error (e.g., submit with missing fields or force a network error) and confirm a red toast appears.
4. **Access denied flow** — log in as a role that does not have permission and trigger a restricted action; confirm a red "Access Denied" toast appears instead of a browser popup.
5. **Multiple toasts** — trigger two quick actions and confirm both toasts stack correctly without overlapping.
6. **Auto-dismiss** — confirm each toast disappears on its own after ~3 seconds.

---

## Summary Table

| Item | Count |
|---|---|
| Total files to update | 16 |
| LandAcquisition files | 8 |
| Compensation files | 8 |
| Total `alert()` calls to replace | ~61 |
| New components to create | 0 |
| Changes to `main.tsx` | 0 (already wired) |
| Changes to `NotificationSystem.tsx` | 0 (already complete) |
