# SecuScan.AI – Database Setup (PostgreSQL + pgvector)

Run these commands **in order** in your terminal. Some require your password (sudo).

---

## Step 1: Fix Homebrew permissions (if needed)

If `brew install` fails with permission errors, run:

```bash
sudo chown -R $(whoami) /opt/homebrew /opt/homebrew/Cellar /opt/homebrew/Frameworks /opt/homebrew/bin /opt/homebrew/etc /opt/homebrew/include /opt/homebrew/lib /opt/homebrew/opt /opt/homebrew/sbin /opt/homebrew/share /opt/homebrew/var
```

---

## Step 2: Install PostgreSQL

```bash
brew install postgresql@17
brew link --overwrite postgresql@17
```

---

## Step 3: Install pgvector (for RAG vector search)

```bash
brew install pgvector
```

---

## Step 4: Start PostgreSQL

```bash
brew services start postgresql@17
```

Wait a few seconds, then verify it's running:

```bash
brew services list | grep postgres
# Should show "started"
```

---

## Step 5: Create database and user

Your `.env` expects:
- **User:** postgres
- **Password:** roaa99
- **Database:** vulnscanner

Run:

```bash
# Connect to default postgres (uses your Mac username, no password)
psql postgres

# Inside psql, run these commands:
CREATE USER postgres WITH PASSWORD 'roaa99' SUPERUSER;
CREATE DATABASE vulnscanner OWNER postgres;
\q
```

If `postgres` user already exists, you may see an error—that's fine. Just ensure the database exists:

```bash
psql postgres -c "CREATE DATABASE vulnscanner OWNER postgres;" 2>/dev/null || true
```

---

## Step 6: Enable pgvector in your database

```bash
psql -d vulnscanner -U postgres -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

(If it asks for a password, use: `roaa99`)

---

## Step 7: Run Prisma migrations

```bash
cd backend && npx prisma migrate dev
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `psql: command not found` | Add PostgreSQL to PATH: `echo 'export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"' >> ~/.zshrc` then `source ~/.zshrc` |
| `connection refused` | PostgreSQL not running: `brew services start postgresql@17` |
| `role "postgres" does not exist` | Create it: `createuser -s postgres` then set password in psql |
| `database "vulnscanner" does not exist` | Create it: `createdb vulnscanner` (as postgres user) |
