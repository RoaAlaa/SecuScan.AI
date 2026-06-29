# SecuScan.AI — Graduation Project Documentation

## Chapter 3: System Architecture and Methods

### 3.1 System Architecture

SecuScan.AI is a full-stack web application for automated vulnerability scanning, report management, and AI-assisted security analysis. The system follows a **three-tier architecture**:

1. **Presentation Tier** — React SPA (Vite, port 3100)
2. **Application Tier** — Node.js / Express REST API (port 5000)
3. **Data Tier** — PostgreSQL with pgvector extension

External integrations:

- **n8n** — orchestrates security scan workflows asynchronously
- **Ollama** — local LLM for RAG chatbot (embeddings + generation)
- **SMTP (Nodemailer)** — scan-complete email notifications

#### 3.1.1 High-Level System Diagram

```
┌─────────────────┐     REST/JSON      ┌─────────────────┐
│  React Frontend │ ◀────────────────▶ │  Express Backend │
│  (Vite :3100)   │     JWT Auth       │  (Node :5000)    │
└─────────────────┘                    └────────┬─────────┘
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    │                           │                           │
                    ▼                           ▼                           ▼
            ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
            │  PostgreSQL   │          │     n8n       │          │    Ollama     │
            │  + pgvector   │          │  (workflows)  │          │  (RAG/Chat)   │
            └───────────────┘          └───────┬───────┘          └───────────────┘
                                               │
                                               │ POST /api/report (callback)
                                               ▼
                                       ┌───────────────┐
                                       │  Express API  │
                                       │  + Nodemailer │
                                       └───────────────┘
```

#### 3.1.2 Frontend Architecture

| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.x | Component-based UI |
| Vite | 7.2.x | Dev server and bundler |
| React Router DOM | 7.13.x | Client-side routing |
| Tailwind CSS | 3.4.x | Utility-first styling |
| Lucide React | 0.564.x | Icons |
| Sonner | 2.0.x | Toast notifications |
| Font Awesome Free | 7.2.x | Supplementary icons |

**Frontend directory structure:**

```
frontend/src/
├── main.jsx                 # Bootstrap, BrowserRouter, Toaster
├── App.jsx                  # Route definitions
├── api/api.js               # Central fetch wrapper + JWT injection
├── context/AuthContext.jsx  # Authentication state
├── utils/reportUtils.js     # Report normalization (mirrors backend)
├── Pages/
│   ├── Home.jsx, Login.jsx, Register.jsx
│   ├── Scan.jsx             # Scan initiation (protected)
│   ├── Dashboard.jsx        # Pending scans + quick actions
│   ├── History.jsx          # Completed scan list
│   ├── Report.jsx           # Vulnerability report viewer
│   ├── Chat.jsx             # RAG chatbot
│   └── Profile.jsx          # Account settings
└── Components/
    ├── Layout/Layout.jsx
    ├── Navbar/Navbar.jsx, UserMenu.jsx
    ├── ProtectedRoute/ProtectedRoute.jsx
    ├── Report/VulnerabilityCard.jsx
    └── AuthInput/, BrandingCard/, Features/, Footer/, Hero/
```

**State management:** React Context API (`AuthContext`) for authentication; local `useState` / `useEffect` for page-level state. No Redux or global store.

**Session storage:**

| Key | Location | Content |
|---|---|---|
| `secuscan_token` | localStorage | JWT from login |
| `secuscan_user` | localStorage | `{ id, name, email }` |

**Routing:**

| Route | Component | Auth |
|---|---|---|
| `/` | Home | Public |
| `/login`, `/register` | Login, Register | Public |
| `/scan` | Scan | Protected |
| `/dashboard`, `/history`, `/profile` | Dashboard, History, Profile | Protected |
| `/report/:scanId` | Report | Public (JWT owner or `?token=`) |
| `/chat` | Chat | Public (report mode requires login) |

**Key UI components:**

- **Scan.jsx** — Tool selection (sqlmap, sstimap, ssrfmap, lfi); submits to `POST /api/scans`
- **Dashboard.jsx** — Polls pending scans every 10 seconds
- **History.jsx** — Lists completed scans; links to report pages
- **Report.jsx** — Polls every 5 seconds until report is ready; severity/type filters
- **Chat.jsx** — Knowledge mode or report-scoped RAG; messages stored in React state only
- **UserMenu.jsx** — Hover dropdown: email, Edit profile, Logout

#### 3.1.3 Backend Architecture

| Technology | Version | Purpose |
|---|---|---|
| Node.js | — | Runtime |
| Express | 5.2.x | HTTP server |
| Prisma ORM | 6.19.x | Database access |
| PostgreSQL + pgvector | — | Relational + vector data |
| bcrypt | 6.0.x | Password hashing |
| jsonwebtoken | 9.0.x | JWT authentication |
| axios | 1.13.x | n8n webhook HTTP client |
| nodemailer | 8.0.x | SMTP email |
| dotenv | 17.3.x | Environment configuration |

**Backend directory structure:**

```
backend/
├── server.js                    # Express entry point
├── prismaClient.js
├── prisma/schema.prisma
├── routes/                      # HTTP route definitions
├── controller/                  # Request handlers
├── middleware/                  # authMiddleware, optionalAuth
├── services/                    # Business logic
│   ├── authService.js, userService.js, scanService.js
│   ├── n8nService.js, reportService.js, reportIngestion.js
│   ├── emailService.js, scanNotificationService.js
│   └── ragService.js, vectorUtils.js, chunking.js
├── utils/reportUtils.js
└── scripts/                     # ingestKnowledge.js, testEmail.js
```

**Architectural pattern:** Routes → Controllers → Services → Prisma (layered separation of concerns).

#### 3.1.4 Database Schema

> **Note:** There is no `ChatHistory` table. Chat messages exist only in frontend React state. RAG context is stored in `DocumentChunk`.

**Entity relationships:**

```
User 1 ──< Scan 1 ──< Report
              │
              ├──< DocumentChunk (sourceType: "report")
              │
ReportAccess (legacy guest token access)

DocumentChunk (sourceType: "knowledge" | "report")
```

**Table 3.1: Primary database models**

| Model | Key fields | Description |
|---|---|---|
| User | id, name, email, password, createdAt | Registered accounts |
| Scan | id, targetUrl, status, userId, finishedAt | Scan job lifecycle (`pending` → `completed`) |
| Report | id, scanId, type, severity, details (JSON) | n8n scan results |
| ReportAccess | scanId, email, token, expiresAt | Legacy guest one-time report links (7 days) |
| DocumentChunk | content, embedding (vector), sourceType, scanId, reportId, metadata | RAG vector store |

#### 3.1.5 Security Architecture

| Mechanism | Implementation |
|---|---|
| Password storage | bcrypt hash, cost factor 10 |
| Authentication | JWT (`{ userId }`, 7-day expiry, `JWT_SECRET`) |
| Required auth | `authMiddleware` on `/api/scans`, `/api/users` |
| Optional auth | `optionalAuth` on report read and chat |
| Report access | Owner JWT or valid guest `?token=` |
| Password change | Requires current password verification |
| JSON validation | 2MB body limit; SyntaxError → 400 |

---

### 3.2 Description of Methods and Procedures Used

#### 3.2.1 User Authentication Procedure

1. User submits credentials via `POST /api/auth/login`.
2. `authService.authenticateUser()` looks up user by email.
3. `bcrypt.compare()` validates password against stored hash.
4. JWT signed with `{ userId: user.id }`, returned with user object (no password).
5. Frontend stores token + user in localStorage; attaches `Authorization: Bearer` on subsequent requests.

#### 3.2.2 Vulnerability Scan Procedure (n8n Integration)

**Model: Asynchronous webhook callback (not synchronous).**

1. Authenticated user submits URL + scan tools via `POST /api/scans`.
2. Backend creates `Scan` record with `status: "pending"` and `userId` from JWT.
3. Backend fires `n8nService.triggerScanWorkflow()` (fire-and-forget POST to `N8N_WEBHOOK_URL`).
4. n8n runs security tools (sqlmap, sstimap, ssrfmap, lfi) independently.
5. When complete, n8n POSTs results to `{BACKEND_URL}/api/report` (`callbackUrl`).
6. `reportController.saveReport()` persists report, marks scan `completed`, triggers email and RAG ingestion.
7. Frontend polls `GET /api/report/:scanId` until report is available.

**Outbound payload to n8n:**

```json
{
  "scanId": "uuid",
  "url": "https://target.example.com",
  "targetUrl": "https://target.example.com",
  "callbackUrl": "http://localhost:5000/api/report",
  "scans": ["sqlmap", "sstimap", "ssrfmap", "lfi"],
  "email": "user@example.com",
  "httpRequest": {
    "method": "GET",
    "url": "https://target.example.com",
    "headers": {},
    "body": null,
    "cookies": {}
  }
}
```

#### 3.2.3 RAG Chatbot Procedure

1. User sends message via `POST /api/chat`.
2. **Knowledge mode** (no `scanId`): embed query via Ollama → retrieve similar `DocumentChunk` rows (`sourceType: "knowledge"`) → generate answer via Ollama.
3. **Report mode** (`scanId` provided): verify scan ownership → retrieve report chunks (`sourceType: "report"`, filtered by `scanId`) → generate answer with report-specific system prompt.
4. Response includes `answer`, `mode`, and `sources[]` (chunk previews + similarity scores).

#### 3.2.4 Email Notification Procedure

1. Triggered inside `reportController.saveReport()` immediately after scan status is set to `completed`.
2. `scanNotificationService.notifyScanComplete(scanId)` loads scan + user from database.
3. Sends email to `User.email` (account login email) via `emailService.sendScanCompleteEmail()`.
4. Uses Nodemailer SMTP transport (not n8n email nodes).
5. Fire-and-forget: email failure does not block report save.

---

## Chapter 4: System Implementation and Results

### 4.1 Dataset

SecuScan.AI does not use a static ML training dataset. Operational data includes:

| Data type | Source | Storage |
|---|---|---|
| Scan targets | User-submitted URLs | `Scan.targetUrl` |
| Vulnerability findings | n8n workflow output | `Report.details` (JSON) |
| Security knowledge base | Markdown files in `backend/docs/security/` | `DocumentChunk` (sourceType: `knowledge`) |
| Report embeddings | Ingested after each scan | `DocumentChunk` (sourceType: `report`) |

Knowledge base documents cover: SQL Injection, XSS, LFI/RFI (ingested via `npm run ingest:knowledge`).

### 4.2 Description of Software Tools Used

**Table 4.1: Complete software stack**

| Layer | Tool | Role |
|---|---|---|
| Frontend | React 19 + Vite 7 | SPA UI |
| Frontend | Tailwind CSS 3 | Styling |
| Frontend | React Router 7 | Routing |
| Frontend | Sonner | Notifications |
| Backend | Express 5 | REST API |
| Backend | Prisma 6 | ORM |
| Database | PostgreSQL | Primary storage |
| Database | pgvector | Vector similarity search |
| Integration | n8n | Scan orchestration |
| AI | Ollama (nomic-embed-text, llama3.2) | Embeddings + chat |
| Email | Nodemailer | SMTP notifications |
| DevOps | concurrently | Monorepo dev script |
| DevOps | nodemon | Backend hot reload |

**Environment variables (backend/.env):**

```env
DATABASE_URL=...
JWT_SECRET=...
FRONTEND_URL=http://localhost:3100
BACKEND_URL=http://localhost:5000
N8N_WEBHOOK_URL=http://localhost:5678/webhook/...
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=Secu Scan <noreply@domain.com>
OLLAMA_URL=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text
CHAT_MODEL=llama3.2
RAG_SIMILARITY_THRESHOLD=0.5
```

### 4.3 Setup Configuration (Hardware & Software)

**Minimum development environment:**

| Component | Requirement |
|---|---|
| OS | Windows 10/11, Linux, or macOS |
| Node.js | v18+ recommended |
| PostgreSQL | 14+ with pgvector extension |
| RAM | 8 GB minimum (16 GB recommended for Ollama) |
| n8n | Local instance on port 5678 |
| Ollama | Local instance on port 11434 |

**Startup procedure:**

```bash
# Root monorepo
npm run dev          # Starts backend (:5000) + frontend (:3100)

# Database migrations
npm run migrate

# Seed RAG knowledge base
npm run ingest:knowledge
```

**SMTP test:**

```bash
cd backend
node scripts/testEmail.js user@example.com
```

### 4.4 REST API Reference

**Table 4.2: Complete API endpoint inventory**

| HTTP Method | Endpoint Route | Controller Function | Auth Required? | Description |
|---|---|---|---|---|
| GET | `/` | inline | No | API health check |
| GET | `/test-db` | inline | No | Dev/debug — list users |
| POST | `/api/auth/register` | `register` | No | Create user account |
| POST | `/api/auth/login` | `login` | No | Authenticate; returns JWT |
| GET | `/api/users/profile` | `getProfile` | Yes | Get user profile |
| PUT | `/api/users/profile` | `updateProfile` | Yes | Update name, email, password |
| POST | `/api/scans` | `startScan` | Yes | Start scan; trigger n8n |
| GET | `/api/scans` | `getMyScans` | Yes | List user scans with reports |
| GET | `/api/scans/pending` | `getPendingScans` | Yes | List pending scans |
| DELETE | `/api/scans/:id` | `deleteScan` | Yes | Delete owned scan |
| POST | `/api/report` | `saveReport` | No | n8n callback — save report |
| GET | `/api/report/:scanId` | `getReport` | Optional | Get report (JWT or `?token=`) |
| POST | `/api/chat` | `chat` | Optional* | RAG chatbot |

*\* Report-scoped chat (`scanId` in body) requires JWT and scan ownership.*

#### 4.4.1 Example: Initiate Scan

**Request:**

```http
POST /api/scans
Authorization: Bearer <JWT>
Content-Type: application/json
```

```json
{
  "url": "https://example.com/login",
  "scans": ["sqlmap", "sstimap"]
}
```

**Response (201):**

```json
{
  "scanId": "499d510e-603e-4cd8-a5a0-9a7c49613b2f",
  "message": "Scan started. The report will be sent to your account email when finished.",
  "reportWillBeSentTo": "user@example.com"
}
```

#### 4.4.2 Example: Chat Prompt

**Request:**

```http
POST /api/chat
Authorization: Bearer <JWT>
Content-Type: application/json
```

```json
{
  "message": "What SQL injection findings were detected?",
  "scanId": "499d510e-603e-4cd8-a5a0-9a7c49613b2f"
}
```

**Response (200):**

```json
{
  "answer": "Your scan detected a SQL injection vulnerability...",
  "mode": "report",
  "scanId": "499d510e-603e-4cd8-a5a0-9a7c49613b2f",
  "sources": [
    {
      "id": "chunk-uuid",
      "preview": "Vulnerability 1:\nType: SQL Injection...",
      "similarity": 0.82,
      "source": "Scan report · SQL Injection · high",
      "sourceType": "report"
    }
  ]
}
```

### 4.5 n8n Workflow Integration (Implementation Details)

| File | Role |
|---|---|
| `services/n8nService.js` | Outbound webhook trigger |
| `controller/scanController.js` | Calls trigger after scan creation |
| `controller/reportController.js` | Receives n8n callback |
| `routes/reportRoutes.js` | `POST /` → saveReport (unauthenticated) |

**Callback processing in `saveReport`:**

1. Normalize payload (supports arrays, nested reports, stringified JSON)
2. `prisma.report.create(...)`
3. `prisma.scan.update({ status: "completed" })`
4. `notifyScanComplete(scanId)` — email
5. `ingestReportForScan(...)` — RAG vectors
6. Return `201` with `reportId`

### 4.6 Email Notification Layer (Implementation Details)

| Aspect | Implementation |
|---|---|
| **Dispatcher** | Node.js backend (`scanNotificationService.js` → `emailService.js`) |
| **NOT handled by** | n8n SMTP/Gmail nodes |
| **Mail library** | Nodemailer 8.x |
| **Protocol** | SMTP (Gmail service or generic host) |
| **Trigger** | After successful report DB save |
| **Recipient** | `User.email` from linked scan account |
| **Subject** | "Your Vulnerability Scan Report Is Ready" |

**Email template variables:**

| Variable | Source |
|---|---|
| User name | `User.name` |
| Target URL | `Scan.targetUrl` |
| Website URL | `FRONTEND_URL` env var |
| Recipient | `User.email` |

### 4.7 Experimental Results

The system was validated through the following test scenarios:

| Test | Expected result | Status |
|---|---|---|
| User registration and login | JWT issued; session persisted | Pass |
| Authenticated scan initiation | Scan created as `pending`; n8n triggered | Pass |
| n8n callback | Report saved; scan marked `completed` | Pass |
| Report viewing | Frontend polls and displays vulnerabilities | Pass |
| RAG knowledge chat | Answers from ingested security docs | Pass (requires Ollama) |
| RAG report chat | Answers scoped to selected scan | Pass (requires Ollama + ingestion) |
| Email notification | Email sent to account email on completion | Requires SMTP configuration |
| Profile management | Name, email, password update via API | Pass |

---

## List of Abbreviations (Chapter 3 & 4)

| Abbreviation | Meaning |
|---|---|
| API | Application Programming Interface |
| JWT | JSON Web Token |
| ORM | Object-Relational Mapping |
| RAG | Retrieval-Augmented Generation |
| REST | Representational State Transfer |
| SMTP | Simple Mail Transfer Protocol |
| SPA | Single Page Application |
| SQLi | SQL Injection |
| XSS | Cross-Site Scripting |
| LFI | Local File Inclusion |
| RFI | Remote File Inclusion |
| SSRF | Server-Side Request Forgery |

---

## List of Figures (Suggested)

- Figure 3.1: SecuScan.AI high-level system architecture
- Figure 3.2: Frontend directory structure
- Figure 3.3: Backend layered architecture
- Figure 3.4: Database entity-relationship diagram
- Figure 3.5: n8n asynchronous scan workflow sequence
- Figure 3.6: RAG chatbot processing pipeline
- Figure 3.7: Email notification dispatch flow

## List of Tables (Suggested)

- Table 3.1: Primary database models
- Table 4.1: Complete software stack
- Table 4.2: Complete API endpoint inventory
- Table 4.3: System validation test scenarios

---

*Document generated from the SecuScan.AI codebase. Align figure/table page numbers when merging into the final thesis document.*
