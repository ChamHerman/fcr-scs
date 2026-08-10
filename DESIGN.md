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
- **`--md-shimmer`**: Light `rgba(255,255,255,0.22)` / Dark `rgba(255,255,255,0.10)`

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
- **Universal GSAP Shimmer**: Absolutely-positioned gradient sweep bar using `--md-shimmer` animated continuously via GSAP (`duration: 2.4s`, `ease: power1.inOut`). Skipped when disabled or loading.
- **Disabled State**: Greyed low surface (`disabled:bg-md-surface-container-low disabled:text-md-on-surface-variant/55 disabled:cursor-not-allowed`).

### 2. Card (`Card.tsx`)
- Standard **28px (`rounded-xl`)** border radius.
- `interactive = true` by default (elevates and tints on hover).
- `cursor-pointer` applies strictly when `clickable` is true or an `onClick` handler is passed.

### 3. Form Controls (`Input.tsx`, `Textarea.tsx`, `Select.tsx`)
- All 4 corners rounded-xl (**28px**).
- Horizontal padding `px-5` so text clears the pill curve.
- Labels sit cleanly inside the pill at top-2 left-5.

### 4. Modal (`Modal.tsx`)
- Standard portal component mounting to `document.body` with `.md-modal-overlay` and `.md-modal-content`.
- **28px (`rounded-xl`)** content container.
- GSAP pop-in (`~0.28s, back.out(1.6)`).
- Persistent content mounting (`keepMounted = true` default) so typed input state is preserved across close/reopen.
- Standard footer placement: `[ Cancel (text) ] [ Confirm / Danger (filled/danger) ]`.

### 5. Action Menu Portal (`ActionMenuPortal.tsx`)
- Menu border: `md-outline/30` (`rgba(121, 116, 126, 0.3)`).
- Item divider: `md-surface-container-low/60` (`rgba(231, 224, 236, 0.6)`).

### 6. Wallet Button (`WalletButton.tsx`)
- 3D flip card design. Default `walletAddress` takes full address string.
- Back face automatically displays truncated `first6...last4` address (`0x71C7...976F`).
- Clicking writes full address string to clipboard and triggers success toast.

### 7. Logo & Navbar (`Logo.tsx`, `Navbar.tsx`)
- `<Logo />`: Original SVG mark combining isometric land hex boundary with central lightning bolt, using `fill="currentColor"` for automatic purple/lilac adaptation.
- `<Navbar />`: Sticky auto-hiding header featuring `<Logo />` and wordmark "Smart Contract Resettlement".

## Usage Guidelines
1. **Never use pure white or pure black backgrounds**: Always utilize `md-background` or `md-surface-container`.
2. **Standard Radius**: Standard cards, inputs, and modals must use `28px` (`rounded-xl`).
3. **Motion**: Always use `md-bouncy` (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
4. **Action Button Alignment**: Place the confirm/accept button at the right side of the container, preceded by the cancel/reject button to its left (`| Cancel   Confirm |`).
