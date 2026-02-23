# SecuScan.AI – Run the Full System

This guide covers how to run the complete system (database, backend, frontend, RAG chatbot).

---

## Prerequisites (one-time)

Ensure you have:

1. **PostgreSQL + pgvector** – See [SETUP_DATABASE.md](./SETUP_DATABASE.md)
2. **Node.js** (v18+)
3. **Ollama** – [ollama.ai](https://ollama.ai)

---

## One-time setup

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Database migrations

```bash
cd backend && npx prisma migrate dev
```

### 3. Ingest knowledge base (for RAG chat)

```bash
cd backend && npm run ingest:knowledge
```

### 4. Pull Ollama models

```bash
ollama pull nomic-embed-text   # for embeddings
ollama pull llama3.2           # for chat (or mistral, etc.)
```

---

## Run the system (every time)

Open **3 terminals**.

### Terminal 1: PostgreSQL (if not running as service)

```bash
brew services start postgresql@17
```

(Skip if PostgreSQL is already running.)

### Terminal 2: Ollama

```bash
ollama serve
```

Then in another command (or leave it running):

```bash
ollama run llama3.2:latest    # pre-load the model (optional)
```

### Terminal 3: Backend

```bash
cd backend && npm run dev
```

Backend runs at **http://localhost:5000**

### Terminal 4: Frontend

```bash
cd frontend && npm run dev
```

Frontend runs at **http://localhost:5173**

---

## Quick checklist

| Service      | Command                    | URL                    |
|-------------|----------------------------|------------------------|
| PostgreSQL  | `brew services start postgresql@17` | —                      |
| Ollama      | `ollama serve`             | http://localhost:11434 |
| Backend     | `cd backend && npm run dev` | http://localhost:5000  |
| Frontend    | `cd frontend && npm run dev` | http://localhost:5173  |

---

## Verify

1. **Backend:** http://localhost:5000 → "API Running..."
2. **Frontend:** http://localhost:5173 → SecuScan home
3. **Chat:** http://localhost:5173/chat → Ask "What is SQL injection?"

---

## Optional: run backend + frontend together

From project root:

```bash
# Terminal 1: backend
cd backend && npm run dev

# Terminal 2: frontend
cd frontend && npm run dev
```

Or use a tool like `concurrently` (add to root `package.json`):

```bash
npm install -g concurrently
concurrently "cd backend && npm run dev" "cd frontend && npm run dev"
```
