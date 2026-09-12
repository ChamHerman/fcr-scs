# AGENTS.md

## Testing & Database Rules
- **Database Reset & Reseed Rule**: Always reset and reseed the entire database for testing purposes, while preserving user roles and all Government Administrator (GA) permissions. Adhere strictly to this rule for testing workflows until it is explicitly removed from `AGENTS.md`.

## Canonical Requirements & Architecture Specifications
- **Functional Requirements (`_self/FR.MD`)**: All agents must consult `_self/FR.MD` for locked business logic, canonical payment lifecycle statuses (FR-001), multi-sig calculation formulas (FR-002), confirmation modals (FR-003), dual status normalizer (FR-004), 7-day confirmation windows (FR-005), bank account uniqueness across citizens (FR-006), permanent MyKad immutability (FR-007), submission gates (FR-008, FR-010), fixed dropdown reasons (FR-009), zero-emoji rules (FR-011), and statutory workflow progression (FR-012).
- **Non-Functional & Design Token Standards (`_self/NFR.MD`)**: All agents must consult `_self/NFR.MD` (and `DESIGN.md`) for UI implementation: MD3 palette & tonal surfaces (NFR-001), dual typography standard (Roboto sans & JetBrains Mono for identifiers/financials, NFR-002), 28px organic shape hierarchy (NFR-003), universal `md-bouncy` motion & GSAP shimmer (NFR-004), bottom-square dropdown standard `Select.tsx` (NFR-005), 15-status color badge matrix (NFR-006), color-drained disabled button standard (NFR-007), topbar $\ge 24\text{px}$ clearance (NFR-008), Segregation of Duties UX (NFR-009), and zero raw emojis with Lucide SVG spacing (NFR-010).
