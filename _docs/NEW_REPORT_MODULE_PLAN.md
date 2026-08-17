# Report Module Refinement Plan

## 1. Overview Page & Charts (`ReportsDashboard.tsx`)
**Goal**: The overview dashboard should act as a macro-view of all reports.
- When `reportCategory` is not set (i.e., at `/admin/reports`), we will ensure all three chart sections are displayed:
  1. Case Status Distribution & Growth
  2. Disbursement Status Financial Breakdown
  3. Blockchain Notarization Status & Activity Velocity
- This gives users a complete dashboard letting them know what the reporting function includes.

## 2. Individual Report Pages - Remove Quick Export Banner (`ReportsDashboard.tsx`)
**Goal**: Clean up the individual report pages (e.g., `/admin/reports/case-status`) by removing the large "Export Official Report" quick export banner.
- The `div` wrapping the Quick Export Banners will be conditionally hidden when `reportCategory` is truthy.
- This will leave only the specific KPI cards, specific charts, the filter bar, and the table of records.

## 3. New Action Buttons in Report Pages (`ReportsDashboard.tsx`)
**Goal**: Provide direct report generation actions right above the table.
- In the `.action-bar .right` section, we will add a new button next to the existing `Generate Filtering Report` button.
- The new buttons will be:
  1. **Generate Completed Report** (Triggers a direct PDF download of the current report type without going to the filter page).
  2. **Generate Filtering Report** (Routes to the `/admin/reports/generate` page scoped to this report).

## 4. Dynamic Filter Status Options (`reportConstants.ts` & `GenerateReports.tsx`)
**Goal**: When a user clicks "Generate Filtering Report" from a specific report page, the filter options should be strictly relevant to that report.
- We will split the monolithic `REPORT_STATUS_OPTIONS` in `reportConstants.ts` into three distinct arrays:
  - `CASE_STATUS_OPTIONS`: `['All', 'CASE_REGISTERED', 'VALUATION_IN_PROGRESS', 'PENDING_VALUATION_APPROVAL', 'VALUATION_APPROVED', 'PENDING_COMPENSATION_APPROVAL', 'COMPENSATION_APPROVED', 'OFFER_ISSUED', 'PAYMENT_IN_PROGRESS', 'PAYMENT_COMPLETED', 'CASE_CLOSED']`
  - `PAYMENT_STATUS_OPTIONS`: `['All', 'Approved', 'Transfer Initiated', 'Paid', 'Failed']`
  - `BLOCKCHAIN_STATUS_OPTIONS`: `['All', 'Published', 'Voided']`
- In `GenerateReports.tsx`, the `Filter Status` dropdown will dynamically map over one of these three arrays depending on the currently selected `category`.
