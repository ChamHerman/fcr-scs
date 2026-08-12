# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FCR-SCS (Fair Compensation and Resettlement Smart Contract System) — a digital governance platform for land acquisition compensation under Malaysia's Land Acquisition Act 1960. Academic project (BMSE3004 Collaborative Development). Three layers in one npm-workspaces monorepo.

## Commands

All commands assume `npm install` was run at the repo root (workspaces hoist dependencies).

### Root (npm workspaces)
```bash
npm run dev            # frontend only (alias of dev:frontend)
npm run dev:frontend   # Vite dev server → http://localhost:5173
npm run dev:backend    # unified Express API → http://localhost:3030
npm run build          # builds presentation_layer only
```
Local dev needs 3 processes: PostgreSQL, `dev:backend`, `dev:frontend`.

### Backend (`business_logic_layer/`)
```bash
npm run dev            # ts-node server.ts
npm run build          # tsc → dist/
npm start              # node dist/server.js
npm test               # jest --forceExit (all suites)

npx jest land_acquisition                       # one service's suites
npx jest land_acquisition_service/src/__tests__/case.controller.test.ts
npx jest -t "should return 404 for non-existent case"   # single test by name
```

### Database (`data_layer/database/`)
Prisma CLI **must** be run from this directory — `schema.prisma` has no `url` in its `datasource` block; the connection string is injected by `prisma.config.ts` from `DATABASE_URL`.
```bash
npx prisma migrate dev --name <migration_name>
npx prisma generate
npx prisma db seed      # runs prisma/seed.ts
npx prisma studio       # http://localhost:5555
npx prisma migrate reset  # DESTRUCTIVE — drops all data
```

### Blockchain (`data_layer/blockchain_ledger/`)
```bash
npm run compile          # hardhat compile — REQUIRED before backend blockchain routes work
npm test                 # hardhat test
npm run node             # local Hardhat node
npm run deploy:local     # → localhost network
npm run deploy:sepolia   # → Sepolia testnet
```

### Frontend (`presentation_layer/`)
```bash
npm run dev / npm run build / npm run preview   # build = tsc && vite build
```

## Architecture

### Three layers, one modular monolith backend
- `presentation_layer/` — React 19 + TypeScript + Vite + Tailwind SPA. Talks to the backend only over HTTP.
- `business_logic_layer/` — a **single** Express process (`server.ts`, port 3030) that mounts each domain module's `Router`. Modules are folder-isolated but share one process and one Prisma connection, so cross-module work uses in-process function calls and DB transactions, not HTTP.
- `data_layer/` — Prisma/PostgreSQL schema and migrations, Solidity contracts + Hardhat.

This was deliberately migrated *away* from per-service HTTP ports (see [_docs/MODULAR_MONOLITH_SPEC.md](_docs/MODULAR_MONOLITH_SPEC.md)). **Never reintroduce `app.listen()` inside a service** — a service module exports a `Router` and nothing else.

Mount points in [business_logic_layer/server.ts](business_logic_layer/server.ts):

| Prefix | Module |
|---|---|
| `/api/payments`, `/api/bank-details` | `payment_service` |
| `/api/smart-contract` | `smart_contract_service` |
| `/api/land-acquisition` | `land_acquisition_service` |
| `/api/compensation` | `compensation_management_service` |
| `/health` | server itself |

### Domain module layout
Every implemented service follows the same shape under `<service>/src/`:
```
routes/<domain>.routes.ts   # aggregator: Router() that .use()s sibling sub-routers
routes/<sub>.routes.ts      # actual endpoint definitions
controllers/                # HTTP concerns only: parse req, try/catch, map errors → status codes
services/                   # business rules + Prisma queries
validators/                 # payload validation, called from controllers
interfaces/                 # shared TS types
prisma.ts                   # this module's PrismaClient instance
index.ts                    # module entry
```
Route ordering matters: specific paths (`/cases/:caseId/land`) are declared **before** generic ones (`/cases/:caseId`) to stop parameterized routes swallowing them — preserve this when adding endpoints.

Error convention in controllers: catch, then `res.status(404)` if the message contains "not found", else `res.status(500).json({ error: message })`. Validators produce 400s.

Empty stubs (`.gitkeep` only, frontend pages exist but no backend): `user_management_service`, `reporting_service`, `ai_prediction_service`.

### Prisma
Schema lives in [data_layer/database/prisma/schema.prisma](data_layer/database/prisma/schema.prisma) (~20 models, shared by every module — no per-service schema split). Each service creates its **own** `PrismaClient` in its local `src/prisma.ts` using the driver adapter (`@prisma/adapter-pg` + `pg.Pool`), not the default engine connection. Copy that file verbatim when adding a service.

`DATABASE_URL` is mandatory. Set `ALLOW_DEV_DB_FALLBACK=true` to fall back to `postgresql://fcr_app:postgres@127.0.0.1:5432/fcr_scs?schema=public` locally. Use `127.0.0.1`, not `localhost` — Prisma on Windows hits IPv6 resolution failures (`P1001`). Full setup: [_docs/DB_SETUP.MD](_docs/DB_SETUP.MD).

### Case lifecycle
`CaseStatus` transitions are centralised in [business_logic_layer/land_acquisition_service/src/utils/case-state.machine.ts](business_logic_layer/land_acquisition_service/src/utils/case-state.machine.ts) (`isEditable`, `canAssignValuer`, `canSubmitValuation`, `canCreateCompensation`, …). Add transition rules there rather than inlining status checks in services. Domain flow: land acquisition → valuation → compensation → offer/objection → payment → blockchain notarisation.

### Blockchain integration
[smart_contract_service/src/services/ethereum.service.ts](business_logic_layer/smart_contract_service/src/services/ethereum.service.ts) loads the `CompensationLedger` ABI by probing a list of candidate paths into `data_layer/blockchain_ledger/artifacts/`. If those artifacts are missing it throws at import time — run `npm run compile` in `blockchain_ledger` first. Provider/contract are lazily cached; `resetContractCache()` exists for tests.

`walletAuth` middleware authorises by comparing `req.body.walletAddress` (case-insensitively) against `ADMIN_WALLET_ADDRESS`. `SEPOLIA_RPC_URL` pointing at `127.0.0.1`/`localhost` switches the service to local-node mode.

### Env loading (`server.ts`)
`server.ts` computes a `baseDir` that works from both the source layout and the compiled `dist/` layout, then loads, in order: `smart_contract_service/.env`, `payment_service/.env`, `business_logic_layer/.env`. Because sub-service `.env` files still contain legacy `PORT=3001`/`PORT=3002`, the server captures `SERVER_PORT`/`PORT` **before** loading them and ignores those two legacy values. Set `SERVER_PORT` to override port 3030. `.env*` is gitignored everywhere; `*.env.example` / `*.env.template` are whitelisted.

### Frontend
- Routing is all in [presentation_layer/src/App.tsx](presentation_layer/src/App.tsx): public routes under `<Layout>`, admin under `/admin` + `<AdminLayout>`, member under `/member` + `<MemberLayout>`, both wrapped in `<ProtectedRoute allowedRoles={[...]}>`.
- **Auth is mocked.** `useAuth()` in [components/auth/ProtectedRoute.tsx](presentation_layer/src/components/auth/ProtectedRoute.tsx) hard-returns `{ isAuthenticated: true, role: 'admin' }`. Flip `role` to `'member'` to test the member portal.
- API access goes through `src/services/*Api.ts`, all built on `fetchJSON` in [services/api.ts](presentation_layer/src/services/api.ts), which normalises network failures and non-JSON responses into thrown `Error`s. Base URL: `VITE_API_BASE_URL`, default `http://localhost:3030`.
- Toasts come from the root-level `NotificationProvider` in `main.tsx`.

## Testing

Jest + ts-jest is configured in [business_logic_layer/package.json](business_logic_layer/package.json), `testMatch: **/__tests__/**/*.test.ts`. Suites are **integration tests**: they `import { app } from "../../../server"` and drive it with Supertest — no port binding (`server.ts` skips `app.listen()` when `NODE_ENV === "test"`, which Jest sets automatically), but they **do hit the real PostgreSQL database**, so it must be running and migrated. They assert HTTP status codes and JSON response shapes, treating controllers/services as a black box. Follow that seam for new backend tests; `payment_service/src/__tests__` is the reference.

## Design system

[DESIGN.md](DESIGN.md) is authoritative for all frontend UI work — read it before touching components. Non-negotiables:
- Material You (MD3), seed `#6750A4`. Never pure white or pure black backgrounds — use `md-background` / `md-surface-container` tokens.
- Cards, inputs, and modals are `rounded-xl` (28px); buttons are pill-shaped (`rounded-full`).
- All motion uses `md-bouncy` = `cubic-bezier(0.34, 1.56, 0.64, 1)`.
- Action button order is `[ Cancel ] [ Confirm ]`, confirm rightmost.
- `/design-system` renders a live component gallery.

## Gotchas

- `business_logic_layer/tsconfig.json`'s `include` lists only `server.ts`, `__tests__`, `payment_service/src`, `smart_contract_service/src`. `land_acquisition_service` and `compensation_management_service` compile only because `server.ts` imports them. Add new services to `include` explicitly.
- `dist/` directories are committed-adjacent build output and gitignored — never edit them; they go stale against source.
- `_docs/` holds the specs and phase checklists (`implementation_plan.md`, `task.md`) that drive current work; consult them for module status and intended sequencing.
</content>
