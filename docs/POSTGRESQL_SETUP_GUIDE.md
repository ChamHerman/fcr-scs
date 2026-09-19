# PostgreSQL Database Setup Guide

Comprehensive setup and administration guide for configuring the **PostgreSQL** database used by the **Fair Compensation and Resettlement Smart Contract System (FCR-SCS)**.

---

## 📋 Prerequisites

| Requirement | Recommended Version | Notes |
|---|---|---|
| **PostgreSQL** | 16.x / 17.x / 18.x | EDB installer (Windows), Homebrew (macOS), or APT (Linux) |
| **GUI Tool** | pgAdmin 4 or DBeaver | Bundled with Windows PostgreSQL installer |
| **Node.js** | v20.x or v22.x (LTS) | Required for Prisma CLI & migration scripts |
| **Default Port** | `5432` | Standard PostgreSQL listener |

---

## 🛠️ Step 1: Install PostgreSQL

### Windows (Recommended Installer)
1. Download the interactive installer from the official PostgreSQL portal:  
   👉 **[https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)**
2. Run the installer:
   * **Components**: Check `PostgreSQL Server`, `pgAdmin 4`, and `Command Line Tools`. *(Uncheck Stack Builder)*.
   * **Data Directory**: Default (`C:\Program Files\PostgreSQL\18\data`).
   * **Superuser Password**: Set a password for the `postgres` user (e.g., `postgres` or your secure password). **Keep this safe.**
   * **Port**: `5432` (default).
   * **Locale**: Default locale.
3. Verify CLI availability in Command Prompt or Git Bash:
   ```bash
   psql --version
   ```
   > **Note:** If `psql` is not recognized, add your PostgreSQL bin path (e.g., `C:\Program Files\PostgreSQL\18\bin`) to your Windows System `Path` environment variable.

### macOS (Homebrew)
```bash
brew install postgresql@16
brew services start postgresql@16
```

### Linux (Ubuntu / Debian)
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

## 🗄️ Step 2: Create Database User & Database

Best practice: **Do not use the `postgres` superuser for application connections.** Use a dedicated role (`fcr_app`) with `CREATEDB` privileges (required for Prisma shadow database during migrations).

### Option A: Using pgAdmin 4 (GUI)
1. Open **pgAdmin 4** from the Start Menu.
2. Enter your master password to connect to the local server (`Servers` → `PostgreSQL 18`).
3. Right-click the default `postgres` database → select **Query Tool**.
4. Run the role and database creation script:

```sql
-- 1. Create dedicated application role
CREATE USER fcr_app WITH
  PASSWORD 'postgres'
  LOGIN
  NOSUPERUSER
  CREATEDB
  NOCREATEROLE;

-- 2. Create FCR-SCS database owned by fcr_app
CREATE DATABASE fcr_scs
  WITH
  OWNER = fcr_app
  ENCODING = 'UTF8';
```

5. In pgAdmin, disconnect from `postgres` and switch to the newly created **`fcr_scs`** database.
6. Open **Query Tool** inside the `fcr_scs` database and execute privileges grants:

```sql
-- 3. Grant schema permissions to fcr_app
GRANT ALL PRIVILEGES ON DATABASE fcr_scs TO fcr_app;
GRANT ALL ON SCHEMA public TO fcr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO fcr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO fcr_app;
```

### Option B: Using Command Line (`psql`)
Open your terminal and run:

```bash
# Connect as postgres superuser
psql -U postgres -h localhost -p 5432
```

Execute SQL commands:

```sql
CREATE USER fcr_app WITH PASSWORD 'postgres' LOGIN CREATEDB;
CREATE DATABASE fcr_scs WITH OWNER = fcr_app ENCODING = 'UTF8';
\c fcr_scs
GRANT ALL PRIVILEGES ON DATABASE fcr_scs TO fcr_app;
GRANT ALL ON SCHEMA public TO fcr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO fcr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO fcr_app;
\q
```

---

## ⚙️ Step 3: Configure Environment Variables

Create or update your `.env` file in the **project root directory** by copying `.env.example`:

```bash
cp .env.example .env
```

Ensure the `DATABASE_URL` matches your credentials:

```env
DATABASE_URL="postgresql://fcr_app:postgres@localhost:5432/fcr_scs?schema=public"
```

### Connection String Format
```text
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE_NAME]?schema=[SCHEMA]
```

> **Special Characters in Passwords:** If your password contains special characters like `@`, `#`, `:`, `/`, or `%`, URL-encode them (e.g., `@` becomes `%40`).

---

## 🚀 Step 4: Run Migrations & Seed Data

All database operations are driven from the project root using unified npm scripts:

### 1. First-time Setup (Migrate + Reseed)
Runs all Prisma migrations in sequence and seeds canonical test accounts, roles, statutory email templates, land acquisition projects, and demo payment cases:

```bash
npm run db:reset
```

### 2. Reseed Test Data (Without Dropping Migrations)
To re-populate initial baseline data without dropping the database schema:

```bash
npm run db:seed
# or alias:
npm run dbseed
```

### 3. Deploy Pending Migrations (Production / CI)
Deploys pending schema migrations to an existing database:

```bash
npm run db:migrate
```

### 4. Regenerate Prisma Client
When modifying `schema.prisma`:

```bash
npm run prisma:generate
```

---

## 🔍 Step 5: Verify the Setup

### Method 1: Prisma Studio (Web GUI)
Inspect and manage all records directly through Prisma Studio:

```bash
npx prisma studio --schema=data_layer/database/prisma/schema.prisma
```
Opens automatically at **`http://localhost:5555`**.

### Method 2: Inspect via pgAdmin 4
1. In pgAdmin, expand:
   `Servers` → `PostgreSQL` → `Databases` → `fcr_scs` → `Schemas` → `public` → `Tables`.
2. Confirm core tables exist:
   - `user`, `role`, `user_role`, `role_permission`, `audit_trail`
   - `land_acquisition_project`, `case`, `parcel`, `parcel_valuation`, `compensation_award`
   - `payment_disbursement`, `payment_transaction`, `blockchain_record`, `document`

---

## ❓ Troubleshooting

| Issue / Error | Cause | Resolution |
|---|---|---|
| `P1000: Authentication failed against database server` | Incorrect username or password in `DATABASE_URL` | Check password in `.env`. Verify user credentials with `psql -U fcr_app -d fcr_scs`. |
| `P1001: Can't reach database server at localhost:5432` | PostgreSQL service is stopped or port is blocked | Windows: Run `services.msc`, start `postgresql-x64-18`.<br>macOS: `brew services restart postgresql@16`.<br>Linux: `sudo systemctl restart postgresql`. |
| `P1003: Database fcr_scs does not exist` | Database was not created | Run `CREATE DATABASE fcr_scs;` as described in Step 2. |
| `P3014: Shadow database cannot be created` | `fcr_app` lacks `CREATEDB` attribute | Run `ALTER USER fcr_app CREATEDB;` as superuser. |
| `password authentication failed for user "fcr_app"` | Password mismatch or auth method reject | Ensure `pg_hba.conf` allows `scram-sha-256` or `md5` connections for `localhost`. |
