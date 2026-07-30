# FCR-SCS — PostgreSQL Database Setup (Windows)

> **Goal:** Install PostgreSQL 18.4, configure it securely, view tables/schemas via pgAdmin (MySQL-Workbench-style GUI), and initialize the FCR-SCS database before wiring Prisma to the backend services.

---

## 1. Install PostgreSQL

### 1.1 Download

Go to: https://www.postgresql.org/download/windows/

Download the **interactive installer** by EDB for PostgreSQL **18.4** (latest stable).

### 1.2 Run the Installer

Accept defaults unless noted below:

| Prompt | Value |
|--------|-------|
| Installation directory | `C:\Program Files\PostgreSQL\18` |
| **Components** | ✅ PostgreSQL Server, ✅ pgAdmin 4, ✅ Command Line Tools *(uncheck Stack Builder)* |
| Data directory | `C:\Program Files\PostgreSQL\18\data` |
| **Password** | Set a strong password for the `postgres` superuser — **save this!** |
| Port | `5432` (default) |
| Locale | `Default locale` |

### 1.3 Verify Installation

Open **Command Prompt** (not PowerShell) and run:

```cmd
psql --version
```

Expected output:
```
psql (PostgreSQL) 18.4
```

If `psql` is not found, add PostgreSQL bin to your PATH:

1. Search **"Edit the system environment variables"**
2. Under **System variables**, find `Path` → Edit
3. Add: `C:\Program Files\PostgreSQL\18\bin`
4. Click OK → restart terminal

---

## 2. pgAdmin 4 — MySQL-Workbench-Style GUI

pgAdmin 4 is installed alongside PostgreSQL and provides a full GUI to:
- Browse databases, schemas, tables, views
- Run SQL queries with syntax highlighting
- View table data, indexes, constraints
- Monitor connections and performance

### 2.1 Launch pgAdmin 4

- Search **pgAdmin 4** in Start Menu, or
- Navigate to `C:\Program Files\PostgreSQL\18\pgAdmin 4\bin\pgAdmin4.exe`

pgAdmin opens in your **web browser** (localhost) — this is normal.

### 2.2 Connect to Local Server

On first launch:
1. Right-click **Servers** → **Register** → **Server**
2. Fill in the **General** tab:
   - Name: `FCR-SCS Local`
3. Switch to **Connection** tab:
   - Host: `localhost`
   - Port: `5432`
   - Username: `postgres`
   - Password: *(the password you set during install)*
   - ✅ Save password
4. Click **Save**

You should now see your server expand to show databases.

---

## 3. Create the FCR-SCS Database and User

Best practice: **never use the `postgres` superuser for app connections.** Create a dedicated user.

### 3.1 Open Query Tool in pgAdmin

1. Expand the server → right-click **postgres** database → **Query Tool**

### 3.2 Create a Dedicated Database User

```sql
-- Create a dedicated role for the application
CREATE USER fcr_app WITH
  PASSWORD 'postgres'
  LOGIN
  NOSUPERUSER
  CREATEDB
  NOCREATEROLE;
```

> Replace `postgres` with your password if different. `CREATEDB` is required for Prisma shadow database.

### 3.3 Create the Database

```sql
CREATE DATABASE fcr_scs
  WITH
  OWNER = fcr_app
  ENCODING = 'UTF8'
  LC_COLLATE = 'en_US.UTF-8'
  LC_CTYPE = 'en_US.UTF-8'
  TEMPLATE = template0;
```

> If locale `en_US.UTF-8` fails on Windows, use `C` or leave LC_COLLATE/LC_CTYPE out — PostgreSQL will use the system default.

### 3.4 Grant Privileges

**Important:** In pgAdmin, right-click the newly created `fcr_scs` database and select **Query Tool** to run this (do NOT run this in the `postgres` database query tool).

```sql
GRANT ALL PRIVILEGES ON DATABASE fcr_scs TO fcr_app;
GRANT ALL ON SCHEMA public TO fcr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO fcr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO fcr_app;
```

### 3.5 Verify in pgAdmin

Refresh the server tree:
- **Servers** → **FCR-SCS Local** → **Databases** → `fcr_scs` ✅

---

## 4. Configure `.env` Files

Set up `.env` for each service that uses the database.

### 4.1 `data_layer/database/.env`

```env
DATABASE_URL="postgresql://fcr_app:postgres@127.0.0.1:5432/fcr_scs?schema=public"
```

### 4.2 `business_logic_layer/smart_contract_service/.env`

```env
PORT=3001
DATABASE_URL="postgresql://fcr_app:postgres@127.0.0.1:5432/fcr_scs?schema=public"
ADMIN_WALLET_ADDRESS=0xYOUR_ADMIN_WALLET_HERE
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
DEPLOYER_PRIVATE_KEY=YOUR_DEPLOYER_PRIVATE_KEY
CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
```

### 4.3 `business_logic_layer/payment_service/.env`

```env
PORT=3002
DATABASE_URL="postgresql://fcr_app:postgres@127.0.0.1:5432/fcr_scs?schema=public"
```

> ⚠️ **Never commit `.env` files.** Ensure `*.env` and `.env*` are in each service's `.gitignore`.

---

## 5. Set up Prisma and Create Tables

Since the repository is already set up on GitHub, you just need to install the dependencies and run the migration.

### 5.1 Install Dependencies

```bash
cd data_layer/database
npm install
```

### 5.2 Add Your Own Tables

Open `data_layer/database/prisma/schema.prisma`.

---
**💡 FOR TEAM MEMBERS: How to convert SQL to Prisma**
Since you are familiar with SQL, you do NOT write `CREATE TABLE` scripts in Prisma. Instead, you write `model` blocks in `schema.prisma`. Prisma generates the SQL for you.

*Your SQL concept:*
```sql
CREATE TABLE User (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
*Becomes this Prisma model:*
```prisma
model User {
  id        String   @id @default(uuid())
  name      String
  email     String?  @unique    // '?' means optional/nullable
  createdAt DateTime @default(now())
}
```
**Quick Cheat Sheet:**
1. **Types:** `VARCHAR/TEXT` → `String`, `INT` → `Int`, `DECIMAL` → `Decimal`, `TIMESTAMP` → `DateTime`, `BOOLEAN` → `Boolean`.
2. **Primary Key:** Add `@id`. If using UUIDs, add `@default(uuid())`.
3. **Null/Optional:** Add `?` after the type (e.g., `String?`). By default, Prisma assumes `NOT NULL`.
4. **Defaults:** Use `@default(...)` (e.g., `@default(now())` or `@default("Pending")`).

**FAST WAY (AI Prompt):**
If you want to let the AI do this for you automatically, paste your SQL code into a new file (e.g., `my_tables.sql`), then give your agent this exact prompt:
> "Read the SQL table definitions in `my_tables.sql`. Convert them into Prisma models following standard Prisma conventions. Then, use your file editing tools to **append** the new models into `data_layer/database/prisma/schema.prisma`. Do not overwrite the existing models, just add the new ones at the bottom."
---

### 5.3 Run the Migration

This command creates the tables in PostgreSQL and generates the Prisma client.

```bash
npx prisma migrate dev --name init_blockchain_payment_tables
```
Expected output:
```
Applying migration `20260728_init_blockchain_payment_tables`
Your database is now in sync with your schema.
✔ Generated Prisma Client
```

### 5.4 Verify Tables in pgAdmin

In pgAdmin, expand:

```
FCR-SCS Local
  └── Databases
        └── fcr_scs
              └── Schemas
                    └── public
                          └── Tables
```

Right-click any table → **View/Edit Data** → **All Rows** to see data like MySQL Workbench.

---

## 6. Browsing the Database in pgAdmin

pgAdmin covers everything MySQL Workbench does:

| MySQL Workbench | pgAdmin 4 Equivalent |
|-----------------|----------------------|
| Schema browser | Left tree: Schemas → Tables |
| Table data viewer | Right-click table → View/Edit Data |
| SQL editor | Query Tool (top toolbar icon) |
| ER diagram | Right-click schema → ERD Tool |
| Column definitions | Right-click table → Properties → Columns tab |
| Indexes | Right-click table → Properties → Indexes tab |
| Foreign keys | Right-click table → Properties → Foreign Keys tab |
| Query history | Query Tool → History tab |

### Quick tip — open Table Data

1. Expand `fcr_scs` → `Schemas` → `public` → `Tables`
2. Right-click a table → **View/Edit Data** → **First 100 Rows**
3. A spreadsheet-style grid opens — you can filter, sort, and even edit rows inline

---

## 7. Prisma Studio — Lightweight Alternative GUI

Prisma Studio gives a simple table browser directly from the terminal, useful for quick checks during development without opening pgAdmin.

```bash
cd data_layer/database
npx prisma studio
```

Opens at `http://localhost:5555` — shows all models with row counts, lets you browse and edit records.

---

## 8. Best Practices Summary

| Practice | Applied |
|----------|---------|
| Dedicated app user (not `postgres` superuser) | ✅ `fcr_app` |
| Strong password, stored only in `.env` | ✅ |
| `.env` excluded from git | ✅ `.gitignore` |
| Database owned by app user | ✅ |
| Migrations tracked via Prisma migrate | ✅ Version-controlled in `prisma/migrations/` |
| Schema isolated in `public` with explicit grants | ✅ |
| Port 5432 only accessible locally | ✅ (default, not exposed externally) |

---

## 9. Troubleshooting

### `psql: error: connection refused`
- Open **Services** (Win+R → `services.msc`)
- Find **postgresql-x64-18** → Start

### `role "fcr_app" does not exist`
- Ensure you ran the `CREATE USER` SQL while connected as `postgres`

### `database "fcr_scs" does not exist`
- Confirm `CREATE DATABASE` succeeded in pgAdmin Query Tool

### `P1001: Can't reach database server`
- **Change `localhost` to `127.0.0.1`** in `DATABASE_URL`. Prisma on Windows often fails to resolve `localhost` correctly due to IPv6 issues.
- Double-check your password. If it contains special characters, they must be URL-encoded, or Prisma will fail to connect.
- Ensure PostgreSQL service is running in Windows Services.

### Prisma migration: `column already exists`
- Someone may have run a partial migration. Run:
  ```bash
  npx prisma migrate reset  # WARNING: drops all data
  ```

---

## 10. Quick-Start Checklist

- [ ] PostgreSQL 17 installed on Windows
- [ ] pgAdmin 4 launches and connects to localhost:5432
- [ ] `fcr_app` user created with secure password
- [ ] `fcr_scs` database created and owned by `fcr_app`
- [ ] Privileges granted on public schema
- [ ] `.env` files created in `data_layer/database/`, `smart_contract_service/`, `payment_service/`
- [ ] `npx prisma migrate dev` ran successfully
- [ ] 5 tables visible in pgAdmin under `fcr_scs → public → Tables`
- [ ] Tables browsable via View/Edit Data in pgAdmin

**You are now ready to wire the database to the backend services.**
