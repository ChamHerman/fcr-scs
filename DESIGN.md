# FCR-SCS Design System

## Overview
This document outlines the **Material You (Material Design 3)** implementation strategy used in the Smart Contract Resettlement System (FCR-SCS) frontend application. The system provides a modern, accessible, and user-friendly interface using React and Tailwind CSS.

## Design Philosophy
The FCR-SCS interface follows the Material You guidelines, focusing on:
- **Tonal Surfaces**: Using tinted off-white and soft dark colors for background depth rather than stark white or pure black.
- **Organic Shapes**: Emphasizing generous 28px (`rounded-xl`) border radii for cards, inputs, and modals, pill-shaped buttons, and atmospheric background blurs.
- **Micro-interactions**: Incorporating smooth `md-bouncy` transitions, GSAP hover scale (1.02), and press feedback (0.95).
- **Universal Shimmer**: Continuous subtle GSAP shimmer sweep bars across active button variants.
- **Progressive Elevation**: Using shadow transitions (`shadow-sm` to `shadow-md`) to reveal depth upon interaction.

## File Structure

```text
presentation_layer/
├── tailwind.config.js       # Contains MD3 tokens, colors, radii, and custom md-bouncy easing.
├── postcss.config.js        # PostCSS configuration.
└── src/
    ├── index.css            # Global CSS, base styles, --md-shimmer variables, and modal overlay rules.
    ├── App.tsx              # Router configuration (react-router-dom).
    ├── main.tsx             # Entry point with NotificationProvider.
    ├── hooks/
    │   └── useScrollEdges.ts  # Reports isScrollable / atTop / atBottom for scroll affordances.
    ├── components/
    │   ├── layout/          # Global layout components.
    │   │   ├── Layout.tsx   # Wrapper combining Navbar, Outlet, and Footer.
    │   │   ├── Navbar.tsx   # Auto-hiding sticky navigation bar with SVG Logo & wordmark.
    │   │   └── Footer.tsx   # Global footer.
    │   └── ui/              # Reusable MD3 components (Button, Card, Input, Modal, Logo, WalletButton, etc.).
    └── pages/
        ├── Home.tsx         # Main landing page.
        └── ContactUs.tsx    # Contact form page.
```

## Global Layout Architecture
The application uses standard `react-router-dom` routing. All pages are rendered within a global `<Layout />` wrapper which provides:
1. **Auto-hiding Navbar**: A sticky `<Navbar />` with SVG Logo mark and "Smart Contract Resettlement" wordmark that listens to scroll direction.
2. **Global Footer**: A `<Footer />` consistently applied at the bottom of every page.
3. **Notification Provider**: Root-level state for triggering MD3-compliant toast notifications from any page or component.

## Design Tokens

### Color Palette (Light & Dark Modes - Seed `#6750A4`)
Defined in `tailwind.config.js` and `index.css`.

- **`md-background`**: Light `#FFFBFE` / Dark `#141218`
- **`md-on-surface`**: Light `#1C1B1F` / Dark `#E6E0E9`
- **`md-primary`**: Light `#6750A4` / Dark `#D0BCFF`
- **`md-on-primary`**: Light `#FFFFFF` / Dark `#381E72`
- **`md-secondary-container`**: Light `#E8DEF8` / Dark `#4A4458`
- **`md-on-secondary-container`**: Light `#1D192B` / Dark `#E8DEF8`
- **`md-tertiary`**: Light `#7D5260` / Dark `#EFB8C8`
- **`md-surface-container`**: Light `#F3EDF7` / Dark `#211F26`
- **`md-surface-container-low`**: Light `#E7E0EC` / Dark `#1D1B20`
- **`md-outline`**: Light `#79747E` / Dark `#938F99`
- **`md-on-surface-variant`**: Light `#49454F` / Dark `#CAC4D0`
- **`--md-error`** (`bg-md-error`): `#fce8e6` (defined in `index.css`) — background color for error containers, banners, and badges (`bg-md-error`).
- **`--md-error-text`** (`.text-md-error`): `#b3261e` (defined in `index.css`) — high-contrast font color applied to `.text-md-error`, validation messages, error labels, and invalid input focus outlines.
- **`--md-success`**: `#e6f4ea` / **`--md-success-text`**: `#1e7b4a` (defined in `index.css`)
- **`--md-warning`**: `#fef7e0` / **`--md-warning-text`**: `#8d6e00` (defined in `index.css`)
- **`--md-shimmer`**: Light `rgba(255,255,255,0.22)` / Dark `rgba(255,255,255,0.10)`
- **`--md-scrollbar-thumb`**: Light `rgba(121,116,126,0.4)` / Dark `rgba(147,143,153,0.45)` — used by `.md-scroll-thin`

### Typography
- **Font Family**: Roboto (imported via Google Fonts).
- Headings use medium (500) and bold (700) weights for friendly impact.
- Body text uses regular (400) weight for optimal readability.

### Border Radius
Defined in `tailwind.config.js`. Standard card, input, and modal radius is **`xl` (28px)**.
- `xs` (8px), `sm` (12px), `md` (16px)
- **`lg` / `xl` (28px)**: Standard card, container, form input, and modal radius.
- `2xl` (32px), `3xl` (48px)
- `full` (9999px): Pill-shaped buttons and chips.

### Motion and Easing
- **`md-bouncy`** (`cubic-bezier(0.34, 1.56, 0.64, 1)`): The sole global motion standard applied across hover, press, modal pop-in, and loading transitions.

## Key Components

### 1. Button (`Button.tsx`)
- Default variant is `filled` (alias: `animated-primary`).
- Variants:
  - `filled` / `animated-primary`: Primary CTA (`bg-md-primary text-md-on-primary`).
  - `tonal` / `secondary`: Secondary container (`bg-md-secondary-container text-md-on-secondary-container`).
  - `combined` / `outlined`: Outlined 3rd button (`border border-md-outline text-md-primary`).
  - `danger`: Destructive/reject button (`bg-md-error text-md-on-error`).
  - `text`: Ghost button (`bg-transparent text-md-primary`).
  - `fab`: Floating Action Button (`rounded-2xl`).
- **Icon & Text Spacing**: The inner flex content container of `<Button />` includes `gap-2` (8px) spacing by default, guaranteeing clean visual breathing room between leading/trailing `.svg` icons and button text labels across all action buttons and CTAs.
- **Universal GSAP Shimmer**: Absolutely-positioned gradient sweep bar using `--md-shimmer` animated continuously via GSAP (`duration: 2.4s`, `ease: power1.inOut`). Skipped when disabled or loading.
- **Disabled State**: The variant keeps its own skin — fill, border, elevation and ghosting all survive — and the colour is simply drained out of it with `grayscale opacity-60 cursor-not-allowed`. A disabled `outlined` button therefore stays outlined, and a disabled `text` button stays a ghost instead of growing a grey box. Hover classes live in a separate `hoverClasses` map and are withheld when disabled, because CSS `:hover` still matches a disabled element. `pointer-events-none` is deliberately **not** used: it would suppress `cursor-not-allowed`, the only feedback a dead button offers. Shimmer and all four GSAP handlers are skipped.

### 2. Card (`Card.tsx`)
- Standard **28px (`rounded-xl`)** border radius.
- `interactive = true` by default (elevates and tints on hover).
- `cursor-pointer` applies strictly when `clickable` is true or an `onClick` handler is passed.

### 3. Form Controls (`Input.tsx`, `Textarea.tsx`)
- All 4 corners rounded-xl (**28px**).
- Horizontal padding `px-5` so text clears the pill curve.
- Labels sit cleanly inside the pill at top-2 left-5.

### 3a. Dropdown (`Select.tsx`)
Dropdowns are the one deliberate exception to the all-4-corners rule: **the bottom corners square off so the list reads as flowing out of the field.**

- Not a native `<select>` — a `role="combobox"` trigger plus a portalled `role="listbox"` panel. Owning the corners is impossible otherwise: the popup a browser draws for a native `<select>` is OS-rendered, and `option { border-radius }` is silently ignored.
- **Shape**: field is `rounded-xl` closed; opening animates it to `rounded-b-none` (or `rounded-t-none` when the panel flips above). The panel is square on all four corners and drops its shared border edge, so field and list read as one slab.
- Panel is `md-surface-container` with an `md-outline/30` border, GSAP pop-in matching the modal (`back.out(1.6)`), flips upward near the viewport bottom, and scrolls at 280px using `.md-scroll-thin`.
- Selected row is `md-secondary-container` + check; the active row is `md-surface-container-low`.
- Keyboard: ↑↓ traversal, Home/End, Enter/Space to commit, Escape to dismiss, and type-ahead. Closes on outside click and on outside scroll.
- `onChange` hands back the **value string**, not a `ChangeEvent` — there is no native element to source one from. Pass `name` to get a hidden mirrored input for native form posts.
- Raw `<select>` elements still present in feature pages are not this component. They inherit only the squared-bottom field shape from the global `select` rule in `index.css`; their popup stays OS-drawn.

### 3b. Malaysia States & Districts Standard
Land acquisition case management uses standard Malaysian administrative geographic mappings:
- **13 States & 3 Federal Territories** (`MALAYSIA_STATES`): Johor, Kedah, Kelantan, Melaka, Negeri Sembilan, Pahang, Perak, Perlis, Pulau Pinang, Sabah, Sarawak, Selangor, Terengganu, Wilayah Persekutuan Kuala Lumpur, Wilayah Persekutuan Labuan, Wilayah Persekutuan Putrajaya.
- **Bi-directional Auto-Completion**: Selecting a district automatically infers and populates its corresponding state (`DISTRICT_TO_STATE_MAP`). Selecting a state filters the district selector to that state's districts (`MALAYSIA_DISTRICTS_MAP`).

### 4. Modal (`Modal.tsx`)
- Standard portal component mounting to `document.body` with `.md-modal-overlay` and `.md-modal-content`.
- **28px (`rounded-xl`)** content container.
- GSAP pop-in (`~0.28s, back.out(1.6)`).
- Persistent content mounting (`keepMounted = true` default) so typed input state is preserved across close/reopen.
- Standard footer placement: `[ Cancel (text) ] [ Confirm / Danger (filled/danger) ]`.
- **Scrolling**: the panel is capped at `85vh` and never scrolls itself (`.md-modal-content` is `overflow: hidden`, which also clips content to the 28px radius). The **body is the only scroller** (`flex-1 min-h-0 overflow-y-auto`), so the title and the action row stay pinned however tall the content grows. `min-h-0` is load-bearing — without it a flex child refuses to shrink below its content and the whole panel scrolls instead.
- **Scroll affordance** (driven by `useScrollEdges`): a hairline arms under the header once the body is scrolled down, and above the footer while content remains below, each paired with a 24px `.md-modal-fade` dissolve. Both ends are bare when content fits, and the borders reserve their space as `border-transparent` so arming them shifts nothing. Padding lives on the three rows, not the panel, so the 8px `.md-scroll-thin` scrollbar tracks the panel edge.
- Legacy page-level modals (`.preview-modal`, `.cancel-confirm-modal`, `.reject-modal`) still scroll as a whole panel; the single-scroller rule is scoped to `.md-modal-content`.

### 5. Action Menu Portal (`ActionMenuPortal.tsx`)
- Menu border: `md-outline/30` (`rgba(121, 116, 126, 0.3)`).
- Item divider: `md-surface-container-low/60` (`rgba(231, 224, 236, 0.6)`).
- **Overflow only**: a 3-dots menu is reserved for rows carrying more than four actions. Fewer actions use inline `IconButton`s in a `.row-actions` cell (see Admin List & Row-Action Patterns below) — one click beats a menu hop.

### 6. Wallet Button (`WalletButton.tsx`)
- 3D flip card design. Default `walletAddress` takes full address string.
- Back face automatically displays truncated `first6...last4` address (`0x71C7...976F`).
- Clicking writes full address string to clipboard and triggers success toast.

### 7. Logo & Navbar (`Logo.tsx`, `Navbar.tsx`)
- `<Logo />`: Original SVG mark combining isometric land hex boundary with central lightning bolt, using `fill="currentColor"` for automatic purple/lilac adaptation.
- `<Navbar />`: Sticky auto-hiding header featuring `<Logo />` and wordmark "Smart Contract Resettlement".

### 8. Pagination (`Pagination.tsx`)
Standard Material Design 3 responsive pagination bar for all data tables:
- **Smart Sequence with Ellipsis**: Renders full page boundaries and context with pattern `< [1], 2, 3, ... , <latest page> >`:
  - When `totalPages <= 7`: Displays all page buttons (`1, 2, ..., totalPages`).
  - When `currentPage <= 4` (near start): Displays `1, 2, 3, 4, 5, ..., totalPages`.
  - When `currentPage >= totalPages - 3` (near end): Displays `1, ..., totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages`.
  - When `currentPage` is in the middle: Displays `1, ..., currentPage - 1, currentPage, currentPage + 1, ..., totalPages`.
- **Navigation Controls**: Left `<ChevronLeft />` and right `<ChevronRight />` arrow buttons with proper disabled states on boundaries (`currentPage === 1` and `currentPage === totalPages`).
- **Visual Styling**: Active page button rendered in `bg-md-primary text-md-on-primary` with subtle shadow (`shadow-sm`); hover state on inactive numbers uses `hover:bg-md-primary/8` with smooth bouncy scale (`scale-105`); ellipsis rendered as non-interactive muted dots `…`.
- **Record Summary**: Left section displays `Showing {start}–{end} of {totalCount} {itemLabel}`.

## Admin List & Row-Action Patterns

Admin list pages (Payments Overview, Initiate, Pending Authorisations, Failed Transactions, Blockchain Overview, Publish, Void) follow these interaction standards.

### Table Row Actions: Main Action Button + View Icon + 3-Dots Menu
- **Main Action Button**: Every record row on an admin table/queue must render its primary page action as an explicit button with an `.svg` icon on the left and the action label on the right (e.g., `[ <Send> Initiate ]`, `[ <PenLine> Authorise ]`, `[ <RotateCcw> Retry ]`, `[ <Upload> Publish ]`, `[ <Ban> Void ]`).
- **Icon & Button Spacing**:
  - Always maintain `gap-2` (8px) between the `.svg` icon (`shrink-0`) and the button label text within action buttons.
  - Maintain `gap-2` (8px) spacing between sibling action buttons/icons in `.row-actions`.
- **View Details Button**: The main action button is followed immediately by an inline `IconButton` (`<Eye />`) for inspecting full case/record details.
- **3-Dots Overflow Menu (`ActionMenuPortal`)**: When a row carries more than 2 secondary actions after the main action (e.g. Failed Transactions carrying Request Details Update & Schedule Tomorrow; or Payments Overview carrying Cancel Payment & Dispute Resolution), group the remaining secondary actions into a clean 3-dots overflow menu.
- **Segregation of Duties (SoD) Disabled Button**: When an admin is blocked by Segregation of Duties from authorising a transfer they initiated or already signed, render a compact disabled button `[ <Lock> Self-Signed ]` (`variant="tonal"`, `disabled`) with hover tooltip `title="You cannot authorise a transfer you initiated or previously signed (Segregation of Duties)"` rather than wide multi-line text wrapping across the table row.
- **Color & Contrast Standards**:
  - Primary actions (Initiate, Authorise, Publish, Retry) use filled `md-primary` button skin (`animated-primary`).
  - Destructive actions (Reject, Void, Cancel) use high-contrast red (`text-red-600 dark:text-red-400` / `bg-red-600 hover:bg-red-700 text-white`).
  - Neutral / View actions use `neutral` (`text-md-on-surface-variant`).
- Canonical action icons: Eye = view details, Send = initiate, PenLine = authorise/sign, XCircle = reject, Ban = cancel/void, RotateCcw = retry, PencilLine = request details update, CalendarClock = schedule, Download = receipt, BadgeCheck = resolve, Upload = publish to blockchain, FilePlus2 = create corrected certificate, Undo2 = reopen payment, Lock = self-signed / SoD restricted.

### Payment & Blockchain Identifier Columns
- **Dedicated PAYMENT ID Column**: Every payment module table (`/admin/payment`, `/admin/payment/initiate`, `/admin/payment/pending`, `/admin/payment/failed`, `/bank-portal`) renders a dedicated `PAYMENT ID` column displaying `PMT-${caseId}` (e.g. `PMT-LAC-2026-08-0001`) with monospace bold styling alongside the `CASE ID` column.
- **Case ID cells are clickable and copyable**:
  - The case ID renders as a link-styled span (`cursor: pointer`, underline on hover) that opens the row's detail modal directly — no separate menu step.
  - A copy icon sits beside every case ID (`CaseIdCell`), writing the ID to the clipboard with a success toast.

### 15 Unique Status Color Matrix (11 Payment + 4 Blockchain)
Every status in the Payment and Blockchain modules is mapped to a dedicated CSS badge class (`.payment-badge .status-*`) with unique light and dark mode colors:

| # | Status | Domain | CSS Class | Light Mode (Bg / Text / Dot) | Dark Mode (Bg / Text / Dot) |
|---|--------|--------|-----------|------------------------------|-----------------------------|
| 1 | **Offer Accepted** | Payment | `.status-offer-accepted` | `#E0F2F1` / `#00695C` / `#00897B` (Teal) | `rgba(0,137,123,0.22)` / `#80CBC4` / `#4DB6AC` |
| 2 | **Bank Details Submitted** | Payment | `.status-bank-submitted` | `#E0F7FA` / `#006064` / `#00ACC1` (Cyan) | `rgba(0,172,193,0.22)` / `#80DEEA` / `#4DD0E1` |
| 3 | **Transfer Initiated** | Payment | `.status-transfer-initiated` | `#FFF8E1` / `#8D6E00` / `#FFA000` (Amber) | `rgba(255,160,0,0.20)` / `#FFE082` / `#FFD54F` |
| 4 | **Authorised** | Payment | `.status-authorised` | `#EDE7F6` / `#4527A0` / `#6750A4` (Indigo) | `rgba(103,80,164,0.25)` / `#D0BCFF` / `#B39DDB` |
| 5 | **Paid** | Payment | `.status-paid` | `#E8F5E9` / `#1B5E20` / `#2E7D32` (Emerald) | `rgba(46,125,50,0.22)` / `#A5D6A7` / `#81C784` |
| 6 | **Transfer Failed** | Payment | `.status-transfer-failed` | `#FFEBEE` / `#B71C1C` / `#C62828` (Bright Red) | `rgba(198,40,40,0.25)` / `#FFCDD2` / `#E57373` |
| 7 | **Transfer Rejected** | Payment | `.status-transfer-rejected` | `#FCE4EC` / `#880E4F` / `#AD1457` (Rose Wine) | `rgba(173,20,87,0.25)` / `#F8BBD0` / `#F06292` |
| 8 | **Cancelled** | Payment | `.status-cancelled` | `#F1F5F9` / `#475569` / `#64748B` (Slate) | `rgba(100,116,139,0.25)` / `#CBD5E1` / `#94A3B8` |
| 9 | **Payment Disputed** | Payment | `.status-payment-disputed` | `#FFF3E0` / `#BF360C` / `#E65100` (Warm Orange) | `rgba(230,81,0,0.25)` / `#FFE0B2` / `#FFB74D` |
| 10 | **Scheduled** | Payment | `.status-scheduled` | `#ECEFF1` / `#37474F` / `#546E7A` (Blue-Grey) | `rgba(84,110,122,0.25)` / `#CFD8DC` / `#90A4AE` |
| 11 | **Pending New Bank Details** | Payment | `.status-pending-details` | `#FEF9C3` / `#854D0E` / `#CA8A04` (Warm Honey) | `rgba(202,138,4,0.22)` / `#FEF08A` / `#FACC15` |
| 12 | **Ready to Publish** | Blockchain | `.status-ready-publish` | `#E0F2FE` / `#075985` / `#0284C7` (Electric Sky) | `rgba(2,132,199,0.22)` / `#7DD3FC` / `#38BDF8` |
| 13 | **Published** | Blockchain | `.status-published` | `#DCFCE7` / `#166534` / `#16A34A` (Mint Green) | `rgba(22,163,74,0.22)` / `#86EFAC` / `#4ADE80` |
| 14 | **Voided** | Blockchain | `.status-voided` | `#FFE4E6` / `#9F1239` / `#E11D48` (Deep Crimson) | `rgba(225,29,72,0.25)` / `#FECDD3` / `#FB7185` |
| 15 | **Replacement** | Blockchain | `.status-replacement` | `#F3E8FF` / `#6B21A8` / `#9333EA` (Purple Lilac) | `rgba(147,51,234,0.25)` / `#E9D5FF` / `#C084FC` |

*Note: All statuses use canonical Title Case strings (e.g. `Cancelled`, `Paid`, `Offer Accepted`).*

### Filters apply immediately
- Selecting a status (or bank) applies the filter instantly — no Apply button, no draft/applied state. Clear resets the filter.

### Sidebar icons
- Each sidebar item within a module gets a distinct icon (Initiate = Send, Pending = PenLine, Failed = AlertTriangle, Publish = Upload, Void = Ban); sibling items never share an icon.

### Signature progress
- Lists show signatures as `current/required` (e.g. `1/3`); action modals show how many remain ("2 left").
- Model: the bank initiator always contributes 1 signature; admin approvals add the rest. `required = 1 + approvals` where `approvals = 1 + floor(amount / 1,000,000)`.
- Authorise/sign actions are offered only while signatures are outstanding (`current < required`); once the total is met the transfer is already in process.

## Usage Guidelines
1. **Never use pure white or pure black backgrounds**: Always utilize `md-background` or `md-surface-container`.
2. **Standard Radius**: Standard cards, inputs, and modals must use `28px` (`rounded-xl`). The single exception is dropdowns, whose bottom corners square off so the list joins the field.
3. **Motion**: Always use `md-bouncy` (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
4. **Action Button Alignment**: Place the confirm/accept button at the right side of the container, preceded by the cancel/reject button to its left (`| Cancel   Confirm |`).
5. **Disabled means drained, not replaced**: never swap a component's variant classes out for a grey block. Keep the skin and apply `grayscale opacity-60 cursor-not-allowed`, withholding hover classes rather than overriding them.
6. **Scrollable regions**: any container that can overflow uses `.md-scroll-thin` for the scrollbar, and pins its own header/footer rather than letting the whole panel scroll.
7. **Row actions standard**: Main action is a button `[ <svg> Action Label ]` with `gap-2` internal icon-label spacing, followed by `<Eye />` view icon, and 3-dots `ActionMenuPortal` if more than 2 secondary actions exist. Always provide high-contrast `danger` colors for reject/void/cancel actions in both light & dark modes.
8. **Segregation of Duties UX**: When an action is restricted by Segregation of Duties, display a disabled `[ <Lock> Self-Signed ]` button with tooltip rather than expanding cell text.
9. **Dedicated Payment ID column**: Always display `PAYMENT ID` (`PMT-${caseId}`) alongside `CASE ID` across payment views.
10. **Case IDs are interactive**: clicking the case ID opens its detail modal, and a copy icon sits beside every case ID.
11. **Filters apply on selection**: no Apply button — changing the dropdown value filters immediately.
12. **Distinct sidebar icons**: sibling nav items within a module never share an icon.
