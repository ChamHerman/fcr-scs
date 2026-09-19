# User Roles & Database Seeding Guide

This document provides the standard reference for all seeded user accounts and roles in FCR-SCS, as well as developer instructions on how to completely reset and re-seed the PostgreSQL database.

---

## 🛠️ Database Reset & Seeding Guide

Follow the steps below whenever you need to clear old/stale records and populate a fresh set of test data and accounts.

### Complete Database Reset & Seed
Run the unified reset command from the project root. This command drops all tables, applies Prisma migrations cleanly, and seeds canonical test data and accounts:

```bash
npm run db:reset
```

*(Alternatively, to reseed without dropping migrations: `npm run db:seed` or `npm run dbseed`)*

---

## 🔑 Default Credentials

* **Default Password (All Users)**: `Password$123`
* **Password Storage**: Encrypted with `bcrypt` (10 salt rounds).
* **Account Status**: `isActive: true`

---

## 👥 Seeded User Accounts & Roles Reference

| # | Role Enum (`UserRole`) | Role Name | Email | Full Name | Contact No. | Identification No. (NRIC) | Active |
|---|---|---|---|---|---|---|:---:|
| 1 | `SYSTEM_ADMINISTRATOR` | System Admin | `admin@fcrscs.gov.my` | `Sys Admin 1` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |
| 2 | `GOVERNMENT_ADMINISTRATOR` | Government Admin | `ga1@fcrscs.gov.my` | `Gov Admin 1` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |
| 3 | `GOVERNMENT_ADMINISTRATOR` | Government Admin | `ga2@fcrscs.gov.my` | `Gov Admin 2` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |
| 4 | `GOVERNMENT_ADMINISTRATOR` | Government Admin | `ga3@fcrscs.gov.my` | `Gov Admin 3` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |
| 5 | `GOVERNMENT_ADMINISTRATOR` | Government Admin | `ga4@fcrscs.gov.my` | `Gov Admin 4` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |
| 6 | `GOVERNMENT_ADMINISTRATOR` | Government Admin | `ga5@fcrscs.gov.my` | `Gov Admin 5` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |
| 7 | `GOVERNMENT_OFFICER` | Government Officer | `go1@fcrscs.gov.my` | `Gov Officer 1` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |
| 8 | `GOVERNMENT_OFFICER` | Government Officer | `go2@fcrscs.gov.my` | `Gov Officer 2` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |
| 9 | `GOVERNMENT_OFFICER` | Government Officer | `go3@fcrscs.gov.my` | `Gov Officer 3` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |
| 10 | `GOVERNMENT_OFFICER` | Government Officer | `go4@fcrscs.gov.my` | `Gov Officer 4` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |
| 11 | `GOVERNMENT_OFFICER` | Government Officer | `go5@fcrscs.gov.my` | `Gov Officer 5` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |
| 12 | `LAND_VALUER` | Land Valuer | `lv1@fcrscs.gov.my` | `Land Valuer 1` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |
| 13 | `LAND_VALUER` | Land Valuer | `lv2@fcrscs.gov.my` | `Land Valuer 2` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |
| 14 | `LAND_VALUER` | Land Valuer | `lv3@fcrscs.gov.my` | `Land Valuer 3` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |
| 15 | `LAND_VALUER` | Land Valuer | `lv4@fcrscs.gov.my` | `Land Valuer 4` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |
| 16 | `LAND_VALUER` | Land Valuer | `lv5@fcrscs.gov.my` | `Land Valuer 5` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |
| 17 | `DISPLACED_COMMUNITY_MEMBER` | Member | `m1@fcrscs.gov.my` | `Member 1` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |
| 18 | `DISPLACED_COMMUNITY_MEMBER` | Member | `m2@fcrscs.gov.my` | `Member 2` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |
| 19 | `DISPLACED_COMMUNITY_MEMBER` | Member | `m3@fcrscs.gov.my` | `Member 3` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |
| 20 | `DISPLACED_COMMUNITY_MEMBER` | Member | `m4@fcrscs.gov.my` | `Member 4` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |
| 21 | `DISPLACED_COMMUNITY_MEMBER` | Member | `m5@fcrscs.gov.my` | `Member 5` | `01XXXXXXXX` (10 digits) | `XXXXXXXXXXXX` (12 digits) | ✅ `true` |

---

## 📦 Additional Seeded Test Data

Running the seed script also populates:

1. **Email Templates**:
   * `PASSWORD_RESET`
   * `ACCOUNT_ACTIVATION`
2. **Land Acquisition Pipeline (5 Cases)**:
   * **Created By**: Gov Officer 1 (`go1@fcrscs.gov.my`) for all cases.
   * **Valuer Assignment**: Land Valuer 1 (`lv1@fcrscs.gov.my`) assigned to all cases with status other than `CASE_REGISTERED`.
   * **Cases & Owner Distribution**:
     * `LAC-2026-08-0001` (`CASE_REGISTERED`) – Kampung Baru Urban Renewal (Parcel 1) | **Owner**: Member 1 (`m1`)
     * `LAC-2026-08-0002` (`VALUER_ASSIGNED`) – KL Sentral Railway Expansion (Parcel 2) | **Owners**: Member 2 & Member 3 (`m2` & `m3` Joint)
     * `LAC-2026-08-0003` (`OFFER_ACCEPTED`) – Desa Melati Flood Mitigation (Parcel 3) | **Owner**: Member 4 (`m4`)
     * `LAC-2026-08-0004` (`OFFER_ACCEPTED`) – Sitiawan Tourism Waterfront (Parcel 4, includes active Objection) | **Owner**: Member 5 (`m5`)
     * `LAC-2026-08-0005` (`PENDING_VALUATION_APPROVAL`) – Penang Coastal Infrastructure (Parcel 5, includes Pending Valuation Report for Review testing) | **Owner**: Member 3 (`m3`)
3. **Payment Cases Flow-Test Baseline**:
   * 25 baseline payment records (`PMT-...` / `LAC-2026-08-0001` to `LAC-2026-08-0025`) at `OFFER_ACCEPTED` status with 0 signatures to test multi-sig approval and bank settlement.
