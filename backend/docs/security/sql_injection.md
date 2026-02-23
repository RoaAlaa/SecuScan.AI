# SQL Injection

## What It Is

SQL injection (SQLi) is a vulnerability where an attacker injects malicious SQL code into an application’s database query. If user input is concatenated into SQL without sanitization or parameterization, the database may execute the attacker’s SQL.

## How It Happens

- User-controlled input (forms, query params, headers) is placed directly into a SQL string.
- The application does not use parameterized queries or proper escaping.
- The database runs the combined string as SQL, so the injected part runs with the same privileges as the app.

## Impact

- Read, modify, or delete data (including other users’ data).
- Bypass authentication (e.g. `' OR '1'='1`).
- In some setups: run system commands or access the file system.

## Prevention

- **Use parameterized queries (prepared statements)** so the database treats input as data, not SQL.
- Never build SQL by concatenating user input.
- Apply principle of least privilege: DB user only has needed permissions.
- Validate and sanitize input; use allowlists where possible.
- Use an ORM (e.g. Prisma) that uses parameterized queries by default.

## Detection

- Automated scanners (e.g. SQLMap) send payloads like `'`, `1' OR '1'='1`, and time-based payloads.
- Manual testing: try quoted input and logical conditions in every user-input field and parameter.
