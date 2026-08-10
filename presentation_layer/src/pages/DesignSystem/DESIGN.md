# FCR-SCS Design System — Live Showcase

> **Read-only reference.** This page is a live display of current interface standards. It imports real, reusable components from `src/components/ui/*`, so whenever a component or token is adjusted, this showcase reflects the new standard automatically.

## Opening the Showcase

Run the app and visit the route:

```text
/design-system
```

---

## What Is Shown

1. **Hero Banner** — landing banner pattern: `md-surface-container`, ambient `.md-blur-shape` blobs, badge pill, display heading and CTA buttons.
2. **Color Tokens** — the full MD3 palette (light + dark hex) seeded from `#6750A4` and `--md-shimmer` variables.
3. **Typography** — the Roboto scale (400 / 500 / 700) from Google Fonts.
4. **Border Radius & Elevation** — standard card, container, input & modal radius is **28px (`rounded-xl`)**.
5. **Motion & Easing** — `md-bouncy` (`cubic-bezier(0.34, 1.56, 0.64, 1)`) motion standard.
6. **Buttons** — variants (`filled`/primary, `tonal`/secondary, `combined`/3rd, `outlined`, `danger`, `text`, `fab`), universal continuous GSAP shimmer sweep, bouncy hover scale, and greyed disabled state.
7. **Cards** — standard 28px `rounded-xl`, default interactive=true, pointer cursor on clickable cards only.
8. **Form Controls** — 4-corner `rounded-xl` (28px) `Input`, `Textarea`, `Select`, `SearchInput`, `RadioGroup`, `Checkbox`, `Switch`, and the submit row `[ Cancel (text) ] [ Submit (filled) ]`.
9. **Overlay & Modal** — standard `ui/Modal` with portal mounting, GSAP pop-in (~0.28s back.out), persistent mounted state (`keepMounted=true`), and standard footer layout.
10. **Notifications** — `NotificationSystem` toasts (success / error / general) sliding in from the right.
11. **Action Menu** — `ActionMenuPortal` with dimmer borders (`md-outline/30`, divider `md-surface-container-low/60`).
12. **Wallet Button** — 3D flip button displaying auto-truncated address (`0x71C7...976F`) on back and copying full address to clipboard.
13. **Dashboard Patterns** — stat cards, status badges, filtered data table, stepper, and circular pagination.
14. **Navbar** — sticky auto-hiding header with SVG mark `<Logo />` and wordmark "Smart Contract Resettlement".

---

## Quick Reference (Current Standards)

### Radius
`xs` 8px · `sm` 12px · `md` 16px · **`xl` / `lg` 28px (standard cards, controls & modals)** · `2xl` 32px · `3xl` 48px · `full` 9999px.

### Motion Easing
- **`md-bouncy`** `cubic-bezier(0.34, 1.56, 0.64, 1)` — sole global motion standard for hover, press, modal pop-in, and loading.

### Button Matrix
- **Primary / filled**: `bg-md-primary text-md-on-primary` + continuous GSAP shimmer.
- **Secondary / tonal**: `bg-md-secondary-container text-md-on-secondary-container`.
- **3rd / combined / outlined**: `border border-md-outline text-md-primary`.
- **Danger**: `bg-md-error text-md-on-error` for delete/reject/cancel.
- **Disabled**: Greyed low surface with no shimmer (`disabled:bg-md-surface-container-low disabled:text-md-on-surface-variant/55`).

### Modal & Footer Convention
- **Overlay & Pop-in**: Centered viewport overlay, GSAP pop-in (~0.28s back.out), persistent mounted input state.
- **Footer**: `[ Cancel (text) ] [ Confirm / Danger (filled/danger) ]`.