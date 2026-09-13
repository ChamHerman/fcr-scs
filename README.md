# Fair Compensation and Resettlement Smart Contract System (FCR-SCS)

## Overview

The Fair Compensation and Resettlement Smart Contract System (FCR-SCS) is a digital governance solution developed to enhance the transparency, accountability, and efficiency of compensation and resettlement processes for communities affected by tourism infrastructure development in Malaysia. Developed in alignment with the Visit Malaysia 2026 (VM2026) campaign and United Nations Sustainable Development Goal 8 (SDG 8), the system replaces conventional paper-based compensation management with an integrated digital platform. It combines blockchain technology, artificial intelligence (AI), image processing, and smart contracts to ensure equitable compensation for displaced artisanal fishers, smallholder farmers, and coastal residents.

This project is developed as part of the **BMSE3004 Collaborative Development** course at the Faculty of Computing and Information Technology (FOCS), programme RSW, semester 202605.

## Key features

* **User management and dashboard:** Role-based access control for administrators, government officers, land valuers, and displaced community members, featuring centralised dashboards with real-time statistics.
* **Land acquisition and case management:** End-to-end tracking of the acquisition lifecycle, statutory form generation, and secure document management in compliance with the Land Acquisition Act 1960.
* **AI asset valuation:** Computer vision and machine learning models utilising OpenCV and Scikit-learn to detect assets, estimate fair market values, and identify potential valuation discrepancies.
* **Compensation management:** Automated calculation of comprehensive compensation packages, approval workflows, and digital offer generation.
* **Smart contract and blockchain integration:** Immutable recording of compensation agreements and automated execution of payment conditions using Solidity smart contracts on the Ethereum Sepolia Testnet.
* **Payment integration:** Secure simulation of off-chain bank transactions and cryptographic notarisation of payment receipts on the blockchain.
* **Reporting and analytics:** Interactive data visualisation using Chart.js and automated generation of compliance, audit, and valuation reports.
* **System audit and monitoring:** Comprehensive logging of user activities, system anomalies, and statutory deadline tracking to ensure institutional accountability.

## Current project status

> **Unified Modular Monolith Backend & Integrated Layers.** The repository implements a layered architecture. The business logic layer features a unified Node.js/TypeScript Express server (`server.ts`) mounting domain routes (`payment_service`, `smart_contract_service`). The data layer includes PostgreSQL database integration with Prisma ORM v7 (`@prisma/adapter-pg`), Hardhat Ethereum ledger smart contracts, and environment configuration validation supporting both source and compiled `dist/` execution layouts.

### Project Structure (Layered Architecture)

```text
fcr-scs/
├── presentation_layer/           # (React.js + TypeScript + Vite application)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/           # Layout, Navbar, Footer
│   │   │   └── ui/               # Button, Card, Input, Checkbox, RadioGroup,
│   │   │                         # Select, Switch, Textarea, NotificationSystem
│   │   ├── pages/                # Home, ContactUs
│   │   ├── App.tsx               # Router configuration (react-router-dom)
│   │   └── main.tsx              # Entry point with NotificationProvider
│   ├── tailwind.config.js        # Material You (MD3) design tokens
│   ├── vite.config.ts
│   └── package.json
├── business_logic_layer/         # (Node.js & Python Services)
│   ├── server.ts                 # Unified Express API Server entrypoint
│   ├── payment_service/          # Bank details management & multi-sig payments
│   ├── smart_contract_service/   # Blockchain integration & document verification
│   ├── user_management_service/
│   ├── compensation_management_service/
│   ├── reporting_service/
│   ├── land_acquisition_service/
│   └── ai_prediction_service/
├── data_layer/                   # (Data Access & Infrastructure)
│   ├── database/                 # PostgreSQL schema, Prisma migrations & seed scripts
│   ├── blockchain_ledger/        # Solidity smart contracts & Hardhat environment
│   ├── ai_model_repository/
│   └── document_storage/
├── DESIGN.md                     # Material Design 3 implementation guide
├── LICENSE                       # MIT
└── README.md
```

### Module Status

| Module | Layer | Tech | Status |
|---|---|---|---|
| Frontend | Presentation | React, TypeScript, Tailwind CSS, Vite, GSAP | In progress |
| Services | Business Logic | Node.js, Express, RESTful API (Unified Server) | Implemented |
| Payment Service | Business Logic | Node.js, Express, Prisma ORM | Implemented |
| Blockchain Service | Business Logic | Ethers.js v6, Solidity, Sepolia / Local Hardhat | Implemented |
| AI Service | Business Logic | Python, Scikit-learn, TensorFlow, OpenCV | Planned |
| Database | Data | PostgreSQL, Prisma ORM v7 (`@prisma/adapter-pg`) | Implemented |
| Blockchain Ledger | Data | Solidity (`CompensationLedger.sol`), Hardhat | Implemented |
| Reporting | Business Logic | jsPDF, PDFKit, Chart.js | In progress |

## Development environment

Ensure your local environment matches the versions below to avoid compatibility issues.

| Tool | Version |
|---|---|
| Node.js | v22.23.1 |
| npm | 11.18.0 |
| Python | 3.13.5 |
| Git | 2.55.0 |

### Additional tools (required when planned modules are implemented)

* PostgreSQL
* MetaMask browser extension
* Hardhat (smart contract compilation and deployment)

## Technology stack (frontend)

| Category | Technology | Version |
|---|---|---|
| Framework | React | ^19.2.8 |
| Language | TypeScript | ~6.0.2 |
| Build tool | Vite | ^8.1.1 |
| Styling | Tailwind CSS | ^3.4.19 |
| Routing | react-router-dom | ^7.18.1 |
| Animation | GSAP + @gsap/react | ^3.15.0 / ^2.1.2 |
| Icons | lucide-react | ^1.25.0 |
| Design system | Material You (MD3) | Custom tokens |

## Setup and installation

All workflows are enforced from the **project root directory** using `npm run dev` and `package.json` shortcut commands.

### Root Shortcut Commands

| Command | Description |
|---|---|
| `npm run dev` | Concurrently launches backend (`http://localhost:3030`), frontend (`http://localhost:5173`), and AI service. |
| `npm run db:reset` | Resets the PostgreSQL database (drops tables, runs all migrations, and seeds canonical test data). |
| `npm run db:seed` | Runs the seed script (`seed.ts`) to populate users, email templates, cases, and payment baselines. |
| `npm run db:migrate` | Deploys pending Prisma schema migrations to the database. |
| `npm run db:fresh` | Alias for `npm run db:reset`. |
| `npm run build` | Builds the production bundle for the presentation layer. |

---

### Quick Start: 3 Common Scenarios

#### Scenario 1: `.env` set + Fresh clone / Fresh start + Database has no data
If you have just cloned the repository, set up your `.env` file, and have a fresh database without any tables/data:

```bash
# 1. Install dependencies across all workspaces (also generates Prisma client)
npm install

# 2. Initialize database schema migrations and seed realistic test data
npm run db:reset

# 3. Start all services concurrently
npm run dev
```

The frontend will be available at `http://localhost:5173` and backend API at `http://localhost:3030`.

#### Scenario 2: `.env` set + Dependencies already installed, able to `npm run dev` + Database has no data
If your project is already set up and can run `npm run dev`, but your database is currently empty:

```bash
# 1. Create database schema and populate canonical dummy data
npm run db:reset

# 2. Launch all services concurrently
npm run dev
```

#### Scenario 3: `.env` set + Tester with existing database data + `npm run dev` is already running
If you are actively testing, `npm run dev` is already running in your main terminal, and you want to reset the whole system state back to a clean fresh start with canonical dummy test data:

Open a **separate terminal window** in the project root and run:

```bash
npm run db:reset
```

> **Note:** `npm run db:reset` will wipe all transactional changes, rerun migrations, and reseed the exact canonical testing state:
> - **5 Baseline Cases (`LAC-2026-08-0001` to `LAC-2026-08-0005`)**: Preserved untouched.
> - **10 Cases at `Offer Accepted` (`LAC-2026-08-0006` to `LAC-2026-08-0015`)**: Generated with all 4 mandatory supporting documents, approved valuations, approved compensations, and signed Form H uploaded with frozen blockchain hashes.
> - **5 Cases at `Offer Issued` (`LAC-2026-08-0016` to `LAC-2026-08-0020`)**: Generated with all 4 mandatory supporting documents and official Form H offer letters awaiting member response (`m1` through `m5`).
> - **Zero Pre-seeded Payment/Blockchain Data**: No hardcoded payment or blockchain records are seeded. Everything starts cleanly from Case Management — payment cases and blockchain notarization queues are dynamically generated upon member offer acceptance and GA blockchain publication.

## Design system

The frontend follows **Material You (Material Design 3)** principles. Full details are documented in [DESIGN.md](file:///c:/repository/fcr-scs/DESIGN.md).

Key design characteristics:
* **Colour seed:** Purple `#6750A4`
* **Typography:** Roboto (Google Fonts)
* **Motion:** Custom `md-bouncy` and `md-emphasized` easing curves
* **Surfaces:** Tonal surfaces with tinted off-white backgrounds (never pure white)
* **Components:** Pill-shaped buttons, 24px card radii, filled text fields, toast notification system

## Team

| Name | Role | Student ID |
|---|---|---|
| Cham Herman | Project Manager, Development Lead | 25WMR09909 |
| Lum Siew Feng | Requirement Lead | 25WMR10011 |
| Wong Kai Bin | Design Lead | 25WMR10068 |
| Yeow Wei Kang | Testing Lead | 25WMR10086 |

**Tutor:** Mr Zahrul Azwan Absl Kamarul Adzhar

## Licence

This project is licensed under the [MIT Licence](file:///c:/repository/fcr-scs/LICENSE).