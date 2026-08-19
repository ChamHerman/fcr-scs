# Report Module Refactoring Plan & Task Breakdown

This single document consolidates the architectural plan and the actionable task breakdown for the Report Module UI updates, PDF generation fixes, and navigation restructuring.

## 1. UI Refinements
**Goal**: Align Report ID styling with the FCR-SCS Design System and rename buttons for clarity.

### Actionable Tasks:
- [x] Locate the `<code>` tags or grey container `<span>` elements wrapping the Report IDs in `presentation_layer/src/pages/Reports/ReportsDashboard.tsx`.
- [x] Locate the same elements in `presentation_layer/src/pages/Reports/GenerateReports.tsx`.
- [x] Remove the grey background styling. Replace with appropriate typography (e.g., `<span style={{ fontWeight: 600 }}>`).
- [x] Open `presentation_layer/src/pages/Reports/ReportsDashboard.tsx`.
- [x] Locate the button with the text "Advanced Report Builder" and rename it to "Generate Filtering Report".

## 2. PDF Generation Fixes
**Goal**: Prevent text overlapping in the PDF headers and stop the generator from producing trailing blank pages.

### Actionable Tasks:
- [x] Open `business_logic_layer/reporting_service/src/services/pdf.service.ts`.
- [x] Modify the first header text ("FAIR COMPENSATION & RESETTLEMENT SMART CONTRACT SYSTEM") to restrict its width (e.g., `width: doc.page.width - 260`) so it wraps cleanly.
- [x] Dynamically set the `Y` coordinate for the secondary title using `doc.y + 4` so it pushes down if the main title wraps.
- [x] Add `bufferPages: true` to the `PDFDocument` constructor initialization.
- [x] Check the table rendering boundary condition (e.g., `if (y > doc.page.height - 60)`). Ensure a new page is ONLY added if there is actual remaining content to render.

## 3. Sidebar Navigation Restructuring
**Goal**: Decouple AI features from Reporting and create a sub-menu for the three different reports.

### Actionable Tasks:
- [x] Open `presentation_layer/src/components/layout/AdminLayout.tsx`.
- [x] Split the single `AI & Reports` section into two distinct sections: `AI Features` (containing AI Valuation) and `Reporting`.
- [x] Convert the `Reporting` navigation item into a collapsible group.
- [x] Add three nested route links under Reporting:
  - `Case Status Report` (`/admin/reports/case-status`)
  - `Payment Report` (`/admin/reports/payment`)
  - `Blockchain Audit Report` (`/admin/reports/blockchain-audit`)
- [x] Update `presentation_layer/src/App.tsx` to handle these new specific routes, passing the selected report category as a parameter to the dashboard component.

## 4. Context-Aware Dashboards and Tables
**Goal**: Make the dashboard tables display accurate, report-specific data instead of forcing generic attributes.

### Actionable Tasks:
- [x] Open `presentation_layer/src/pages/Reports/ReportsDashboard.tsx`.
- [x] Replace the generic "Recent Tracked System Records" table headers and rows with conditional rendering based on the active report type.
  - **Case Status Table**: Render Status, Location, Lifecycle Aging, Registration Date.
  - **Payment Table**: Render Bank Name, Bank Reference Number, Success Rate, Disbursement Amount.
  - **Blockchain Audit Table**: Render Transaction Hash, Document Hash, Network, Verification Status.
- [x] Update the backend `getDashboardOverviewStats` in `business_logic_layer/reporting_service/src/services/report.service.ts` to attach the necessary specific attributes (Bank details, Tx Hashes) to the recent activity array.

## 5. Context-Aware Report Configuration & Filters
**Goal**: Hide irrelevant filters based on the report type being generated.

### Actionable Tasks:
- [x] Open `presentation_layer/src/pages/Reports/GenerateReports.tsx`.
- [x] Add conditional rendering logic (`if category === 'Payment Report'`, etc.) around the filter inputs.
  - **Case Status Report**: Show all filters (State, District, Status, Date Range).
  - **Payment Report**: Show Status and Date Range. Hide State and District filters completely.
  - **Blockchain Audit Report**: Show Verification Status and Date Range. Hide State and District filters completely.
