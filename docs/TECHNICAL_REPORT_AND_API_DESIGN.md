# SecuScan – Technical Report & API Design

This document describes what the project has, why certain choices were made, the API design, and the end-to-end run flows (including how the email/scan data reaches the database and how login is checked).

---

## 1. Project overview

**SecuScan** is a web application for running security scans (e.g. SQL injection via tools like SQLMap). It supports:

- **Guest users**: Can start a scan by providing **email + target URL**. They get a one-time report link (by email, when implemented) and have no history.
- **Authenticated users**: Can start scans with **target URL** only. Scans appear in **History** and they see **pending** scans on the dashboard. Reports are accessible from history or (when implemented) by email.

The backend is a REST API that stores users and scan history in a database. The frontend is a React SPA that talks to this API only (no in-memory auth or fake data).

---

## 2. Tech stack and why we use it

### 2.1 Backend

| Choice | What we use | Why this, not something else |
|--------|----------------|------------------------------|
| **Runtime** | Node.js | Same language as frontend tooling, good for JSON APIs and async I/O (e.g. future n8n/webhook calls). |
| **Framework** | Express | Simple, widely used, easy to add routes and middleware (auth, CORS, JSON body). |
| **Database** | PostgreSQL | Relational data (users, scans, reports, report access). ACID and relations fit our model. |
| **ORM** | Prisma | Type-safe schema, migrations, and clean API. Avoids raw SQL and keeps schema in one place. |
| **Auth** | JWT + bcrypt | Stateless: no server-side session store. bcrypt for password hashing (industry standard). We do **not** store plain passwords or use in-memory auth. |
| **Validation** | In controllers | Basic checks (required fields, types). Could add Zod/Joi later for stricter validation. |

### 2.2 Frontend

| Choice | What we use | Why this, not something else |
|--------|----------------|------------------------------|
| **UI** | React | Component-based, fits our pages (Home, Scan, Dashboard, History, Report, Login, Register). |
| **Routing** | React Router | Client-side routes for `/`, `/scan`, `/login`, `/report/:scanId`, etc. |
| **Auth state** | React Context + localStorage | Single place for `user` and `login`/`logout`. Token and user stored in localStorage so refresh keeps them; **no in-memory-only auth**. |
| **HTTP** | `fetch` via small `api()` helper | One place for base URL, `Authorization: Bearer`, and error handling. No need for a heavy client SDK yet. |
| **Styling** | Tailwind CSS | Utility classes, dark theme, no separate CSS files for layout. |

### 2.3 Security-related choices

- **Passwords**: Hashed with bcrypt before storing; never logged or returned in API.
- **Report access for guests**: Stored in `ReportAccess` with a **random token** and **expiry**. Only someone with the link (e.g. from email) can open the report; no auth required for that link.
- **Authenticated report access**: User can open a report only if they own the scan (`userId` match) or have a valid `?token=` for that scan.

---

## 3. Database design

We use **PostgreSQL** with **Prisma**. Schema lives in `backend/prisma/schema.prisma`.

### 3.1 Why PostgreSQL (not SQLite / MongoDB)

- **Relational data**: Users → Scans → Reports, and Scan → ReportAccess. Foreign keys and joins are natural.
- **Concurrent access**: Safe for multiple users and future webhooks (n8n) updating scans/reports.
- **Production-ready**: Fits deployment on common hosts (e.g. Railway, Render, VPS).

We did **not** use SQLite for production because of concurrency and scaling, or MongoDB because our model is clearly relational.

### 3.2 Tables

| Model | Purpose |
|-------|--------|
| **User** | Registered users: id, name, email, hashed password, createdAt. |
| **Scan** | One row per scan: targetUrl, status (e.g. `pending`), optional userId (null = guest), createdAt, finishedAt. |
| **Report** | One or more per scan: type, severity, details (JSON). Filled when scan completes (e.g. from n8n). |
| **ReportAccess** | Guest access: scanId, email, token, expiresAt. Used to build the one-time report link and (later) send email. |

Relations:

- User → Scan (one-to-many).
- Scan → Report (one-to-many).
- ReportAccess references Scan (no FK in schema but `scanId` is used in queries).

---

## 4. API design

Base URL: `http://localhost:5000` (or `VITE_API_URL` in frontend). All JSON; errors return a body like `{ "error": "message" }`.

### 4.1 Auth

| Method | Endpoint | Auth | Body | Response | Why |
|--------|----------|------|------|----------|-----|
| POST | `/api/auth/register` | No | `{ name, email, password }` | `{ message }` or `400 { error }` | Create account; password is hashed and never returned. |
| POST | `/api/auth/login` | No | `{ email, password }` | `{ token, user: { id, name, email } }` or `400 { error }` | Validate credentials, return JWT and safe user object; frontend stores both. |

We use **JWT** so the backend stays stateless and the frontend can send `Authorization: Bearer <token>` on every request. We do **not** use server-side sessions or in-memory user store.

### 4.2 Scans

| Method | Endpoint | Auth | Body | Response | Why |
|--------|----------|------|------|----------|-----|
| POST | `/api/scans` | Optional | `{ targetUrl [, email ] }` | `201 { scanId, message, reportWillBeSentTo?, reportLink? }` | Start scan. If no auth, `email` required; backend creates Scan + ReportAccess and returns link for guest. |
| GET | `/api/scans` | Required | — | `200 [ Scan ]` | List scans for the authenticated user (for History). |
| GET | `/api/scans/pending` | Required | — | `200 [ Scan ]` | List scans with `status: "pending"` for dashboard. |

`POST /api/scans` uses **optional** auth: if the request has a valid JWT, `userId` is set and no email is needed; otherwise email is required and a guest ReportAccess is created.

### 4.3 Report

| Method | Endpoint | Auth | Query | Response | Why |
|--------|----------|------|-------|----------|-----|
| GET | `/api/report/:scanId` | Optional | `?token=` (for guests) | `200` report JSON or `403`/`404` | Allow access by owner (JWT) or by valid one-time token (email link). |

Access logic:

- If authenticated and scan belongs to user → allow.
- Else if `?token=` present and matches ReportAccess and not expired → allow.
- Else → 403.

---

## 5. Run flows (how data moves)

### 5.1 Login flow (how “login check” works)

```
┌─────────────┐    1. User enters email + password     ┌─────────────┐
│   Browser   │ ──────────────────────────────────────▶│  Login.jsx  │
│  (Frontend) │                                        │   (form)    │
└─────────────┘                                        └──────┬──────┘
                                                               │
                        2. handleSubmit → login(email, password)
                                                               │
                                                               ▼
┌─────────────┐    3. api("POST", "/api/auth/login",   ┌─────────────┐
│   api.js   │        { email, password })              │ AuthContext │
│            │ ◀─────────────────────────────────────── │  login()    │
└──────┬─────┘                                          └─────────────┘
       │
       │ 4. fetch(API_URL + "/api/auth/login", { method: "POST", body: JSON.stringify(...) })
       │    (no Authorization header for login)
       ▼
┌─────────────┐    5. POST /api/auth/login              ┌─────────────────────┐
│   Backend  │ ───────────────────────────────────────▶│ authController.login│
│  Express   │     Body: { email, password }            └──────────┬──────────┘
└─────────────┘                                                    │
                                                                    │ 6. prisma.user.findUnique({ where: { email } })
                                                                    ▼
                                                           ┌─────────────────────┐
                                                           │   PostgreSQL        │
                                                           │   User table        │
                                                           └──────────┬──────────┘
                                                                    │
                                                                    │ 7. bcrypt.compare(password, user.password)
                                                                    │ 8. jwt.sign({ userId: user.id }, JWT_SECRET)
                                                                    ▼
┌─────────────┐    9. res.json({ token, user })         ┌─────────────────────┐
│   Frontend  │ ◀───────────────────────────────────────│   Backend           │
│ AuthContext │     user = { id, name, email }           └─────────────────────┘
└──────┬──────┘
       │
       │ 10. localStorage.setItem("secuscan_token", token)
       │     localStorage.setItem("secuscan_user", JSON.stringify(user))
       │     setUser(user)
       │ 11. navigate(from)  (e.g. to "/" dashboard)
       ▼
  User is logged in; next API calls send Authorization: Bearer <token>.
```

So: **frontend sends email + password → backend loads user from DB by email → checks password with bcrypt → returns JWT + user → frontend stores both and uses token on later requests.** There is no in-memory user store; the “source of truth” is the DB and the JWT.

---

### 5.2 Scan flow: guest enters email + URL (how it reaches the DB)

```
┌─────────────┐    1. Guest enters email + target URL   ┌─────────────┐
│   Browser   │        (no login)                       │   Scan.jsx  │
└─────────────┘                                        └──────┬──────┘
                                                               │
                        2. handleSubmit: body = { targetUrl, email }
                                                               │
                                                               ▼
┌─────────────┐    3. api("POST", "/api/scans", body)   ┌─────────────┐
│   api.js   │        No token in localStorage         │   Scan.jsx  │
│            │        → no Authorization header       └─────────────┘
└──────┬─────┘
       │
       │ 4. fetch(API_URL + "/api/scans", { method: "POST", body, headers: { "Content-Type": "application/json" } })
       ▼
┌─────────────┐    5. POST /api/scans                  ┌─────────────────────┐
│   Backend  │     optionalAuth → req.userId = null    │ scanController      │
│            │     Body: { targetUrl, email }           │ .startScan          │
└─────────────┘                                        └──────────┬──────────┘
                                                                    │
                                                                    │ 6. Validate targetUrl + email
                                                                    │ 7. prisma.scan.create({
                                                                    │      data: { targetUrl, status: "pending", userId: null }
                                                                    │    })
                                                                    ▼
                                                           ┌─────────────────────┐
                                                           │   PostgreSQL        │
                                                           │   Scan table        │
                                                           │   (new row)         │
                                                           └──────────┬──────────┘
                                                                    │
                                                                    │ 8. generateToken() (crypto.randomBytes)
                                                                    │ 9. prisma.reportAccess.create({
                                                                    │      data: { scanId, email, token, expiresAt }
                                                                    │    })
                                                                    ▼
                                                           ┌─────────────────────┐
                                                           │   ReportAccess       │
                                                           │   (new row)         │
                                                           └──────────┬──────────┘
                                                                    │
┌─────────────┐    10. 201 { scanId, reportWillBeSentTo,  ┌─────────────────────┐
│   Frontend  │       reportLink }                          │   Backend           │
│   Scan.jsx  │ ◀──────────────────────────────────────────└─────────────────────┘
└──────┬──────┘     reportLink = FRONTEND_URL/report/{scanId}?token={token}
       │
       │ 11. setSubmitted({ scanId, reportWillBeSentTo, reportLink })
       │     Show "Scan started", "report will be sent to ...", and the link
       ▼
  Guest can save the link; later they open it and backend allows access via ?token=.
```

So: **guest email and URL go from the form → `api()` → POST /api/scans → backend writes one row in Scan and one in ReportAccess → response includes the report link.** The email is stored only in ReportAccess (for the report link and future email sending); it is not used as a “user” account.

---

### 5.3 Scan flow: authenticated user (URL only)

Same as above, except:

- Frontend sends `Authorization: Bearer <token>`.
- **optionalAuth** sets `req.userId` from the JWT.
- Backend creates Scan with `userId: req.userId` and **does not** create ReportAccess.
- Response has no `reportLink`; `reportWillBeSentTo` can be “your email” (or omitted).
- User sees the scan in **History** and **Pending** because GET /api/scans and GET /api/scans/pending use the same JWT and return scans where `userId = req.userId`.

---

### 5.4 Opening a report (by link or from History)

- **From History**: User clicks a scan → frontend goes to `/report/:scanId`. Request includes `Authorization: Bearer <token>`. Backend allows access if `scan.userId === req.userId`.
- **From email link**: User opens `/report/:scanId?token=...`. No auth header. Backend finds ReportAccess by scanId + token, checks expiry, then allows access.

In both cases the backend loads Scan (and Report if present) from the DB and returns the report JSON (or sample/404).

---

## 6. Middleware

| Middleware | Used on | Behavior |
|------------|--------|----------|
| **authMiddleware** | GET /api/scans, GET /api/scans/pending | Requires `Authorization: Bearer <token>`. Verifies JWT, sets `req.userId`. Returns 401 if missing or invalid. |
| **optionalAuth** | POST /api/scans, GET /api/report/:scanId | If header present, verifies JWT and sets `req.userId`. If missing or invalid, continues with `req.userId` undefined. |

So: **login check** is “send credentials → backend checks DB and bcrypt → returns JWT”. **Subsequent “is this user logged in?”** is “send JWT → middleware verifies and sets req.userId”. No session store; all identity comes from the JWT and DB.

---

## 7. Frontend storage and auth

| Key | Content | Used for |
|-----|--------|----------|
| `secuscan_token` | JWT string | Sent as `Authorization: Bearer` on every API call (via api.js). |
| `secuscan_user` | JSON `{ id, name, email }` | Display name/email and to know “user is logged in”; restored on load only if token exists. |

On page load, AuthContext reads both from localStorage; if either is missing, user is treated as logged out. Logout clears both keys.

---

## 8. Summary

- **What we have**: Real backend (Express + Prisma + PostgreSQL), JWT auth, scan and report APIs, guest vs authenticated flows, and a frontend that uses only this API (no in-memory auth).
- **Why**: PostgreSQL and Prisma for reliable, relational storage; JWT for stateless auth; optionalAuth so the same “start scan” and “get report” endpoints support both guests (email + token) and logged-in users (JWT).
- **Run flow**: Login = form → POST /api/auth/login → DB + bcrypt check → JWT + user back → stored in localStorage. Scan = form (email + URL or URL only) → POST /api/scans → DB (Scan + optional ReportAccess) → response with scanId and optional reportLink. Report = GET /api/report/:scanId (and optional ?token=) → backend checks owner or ReportAccess → returns report from DB (or sample/404).

This gives you a single reference for documentation, API design, and the exact flow from “user writes email and URL in the front” to “data in the DB” and “how login is checked.”
