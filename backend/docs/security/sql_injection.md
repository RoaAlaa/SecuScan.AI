# Vulnerability: SQL Injection (SQLi)

## 1. Overview and Definition
SQL injection (SQLi) is a critical web security vulnerability where an attacker manipulates an application's database query by injecting malicious SQL code. Also known as SQL injection or database injection. When an application takes untrusted user input and concatenates it directly into a SQL query without proper sanitization or parameterization, the database is tricked into executing the attacker's payload. 

Because the injected code runs with the same privileges as the application's database user, it fundamentally breaks the boundary between data and executable instructions.

---

## 2. How It Happens (The Mechanism)
The vulnerability arises from insecure coding practices where strings are dynamically built. 
* User-controlled input (such as form fields, URL query parameters, or HTTP headers) is accepted by the application.
* The application directly merges this input into a SQL statement using string concatenation.
* The database evaluates the combined string, allowing the attacker to alter the query's underlying logic.

**Example of Vulnerable Logic:**
If an application uses string concatenation to verify a login:
`SELECT * FROM users WHERE username = '` + userInput + `' AND password = '` + passInput + `'`

An attacker entering `' OR '1'='1` as the username alters the query to:
`SELECT * FROM users WHERE username = '' OR '1'='1' AND password = ''`
Since `1=1` is always true, the database returns the first record (often the admin), bypassing authentication entirely.

---

## 3. Business Impact
A successful SQLi attack can be catastrophic, leading to:
* **Data Exfiltration:** Reading unauthorized data, including sensitive PII, financial records, or other users' private information.
* **Data Manipulation:** Modifying, corrupting, or deleting data (e.g., dropping tables or altering balances), destroying database integrity.
* **Authentication Bypass:** Logging into the application as an administrator without needing a password.
* **System Takeover:** In certain configurations (e.g., using `xp_cmdshell` in MSSQL), attackers can execute operating system commands on the underlying database server, leading to full infrastructure compromise.

---

## 4. Prevention and Mitigation
Defending against SQLi requires a defense-in-depth approach, prioritizing how the application handles data.

### A. Parameterized Queries (Prepared Statements) [Primary Defense]
The absolute best defense is ensuring the database treats input strictly as data, not as executable code. Prepared statements compile the SQL query first, then insert the user inputs as parameters.
* **Node.js (pg library):** `client.query('SELECT * FROM users WHERE email = $1', [userInput])`
* **Python (Flask/psycopg2):** `cursor.execute("SELECT * FROM users WHERE email = %s", (userInput,))`

### B. Safe ORM Usage
Modern Object-Relational Mappers (ORMs) like Prisma generally protect against SQLi by default by using parameterized queries under the hood (e.g., `prisma.user.findUnique`). However, developers must be cautious when executing raw SQL:
* **Safe Raw Query:** ``prisma.$queryRaw`SELECT * FROM User WHERE email = ${email}` `` (Prisma uses tagged templates to parameterize this safely).
* **Vulnerable Raw Query:** ``prisma.$queryRawUnsafe(`SELECT * FROM User WHERE email = '${email}'`)`` (Direct string concatenation circumvents the ORM's protection and opens the door to SQLi).

### C. Principle of Least Privilege
The database account used by the application should only have the minimum permissions necessary. It should not have administrative rights, and commands to drop tables or execute system-level scripts should be revoked.

### D. Allow-List Input Validation
For areas where parameterization is difficult (like dynamic `ORDER BY` column names), validate user input against a strict allow-list of expected values before inserting it into the query.

---

## 5. Detection and Testing
Identifying SQLi involves both manual and automated methodologies:
* **Automated Scanning:** Tools like SQLMap and OWASP ZAP automatically inject thousands of payloads (e.g., time-delays, boolean inferences) to detect vulnerabilities.
* **Manual Probing:** Pentesters manually input single quotes (`'`), double quotes (`"`), or logical conditions (`1' OR '1'='1`) into all input vectors to monitor the application for database syntax errors or abnormal behavioral changes.

---

## 6. Trusted References & Further Reading
* **OWASP – SQL Injection:** [https://owasp.org/www-community/attacks/SQL_Injection](https://owasp.org/www-community/attacks/SQL_Injection)
* **PortSwigger Web Security Academy – SQL Injection:** [https://portswigger.net/web-security/sql-injection](https://portswigger.net/web-security/sql-injection)