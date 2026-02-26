# SecuScan Chatbot: Everything Used to Build It (A to Z)

This document explains every component of the SecuScan vulnerability chatbot—in **general terms** first, then **technically**—so you can understand the full pipeline from the user typing a question to seeing an answer.

---

## High-level idea

**Generally:** The chatbot answers security questions (SQLi, XSS, LFI, RFI) by (1) turning the question into a “fingerprint” (embedding), (2) finding the most relevant pieces of text in a pre-built knowledge base, (3) sending those pieces plus the question to a local AI (Ollama), and (4) returning the AI’s answer and optional source hints.

**Technically:** It’s a **RAG (Retrieval-Augmented Generation)** pipeline: the backend embeds the user message with Ollama’s embedding model, runs a vector similarity search in PostgreSQL (pgvector) over `DocumentChunk` rows with `sourceType = "knowledge"`, builds a single prompt from the top‑k chunks plus the user message, calls Ollama’s `/api/generate` with a fixed system prompt and that prompt, then returns the generated text and chunk metadata to the frontend.

---

## 1. User interface (frontend)

### General

The user sees a chat page: a title, a list of messages (user on the right, assistant on the left), an input box, and a send button. When they type and send, the new message appears immediately, a “Thinking…” state is shown, then the assistant’s reply appears—and they can optionally expand “sources” to see which knowledge chunks were used and how well they matched.

### Technical

- **File:** `frontend/src/Pages/Chat.jsx`
- **State:** `messages` (array of `{ role, content, sources? }`), `input`, `loading`, `error`.
- **On submit:** `handleSubmit` prevents default, trims input, appends `{ role: "user", content: text }`, sets `loading` true, then calls `api("POST", "/api/chat", { message: text })`.
- **API helper:** `frontend/src/api/api.js` — `api(method, path, body)` builds the URL from `VITE_API_URL`, sets `Content-Type: application/json` and optional `Authorization: Bearer <token>`, sends `body` as JSON, parses response; on non-OK it throws with `data.error` or a generic message.
- **On success:** Response is `{ answer, mode, sources }`. The code appends `{ role: "assistant", content: data.answer, sources: data.sources || [] }` and clears loading/error.
- **On error:** Error message is set, the last user message is removed, and the input is restored so the user can retry.
- **UI:** Messages are rendered in a scrollable area; assistant messages can show a `<details>` with “N source(s)” and per-source `source` and `similarity` (e.g. “(85% match)”). A ref `messagesEndRef` is used to scroll to the bottom when messages change.

---

## 2. HTTP API (backend entry)

### General

The frontend doesn’t talk to the AI or the database directly. It sends one HTTP request per user message to the backend. The backend validates the body, runs the full RAG + generation flow, and returns the answer and source metadata in one JSON response.

### Technical

- **Route:** `POST /api/chat` — mounted in `backend/server.js` as `app.use("/api/chat", chatRoutes)`.
- **Router:** `backend/routes/chatRoutes.js` — single route: `router.post("/", chat)`.
- **Controller:** `backend/controller/chatController.js`
  - Reads `req.body.message`; if missing or not a non-empty string, responds with `400` and `{ error: "message is required" }`.
  - Calls `chatWithKnowledge(message.trim())` from the RAG service.
  - On success: `res.json({ answer, mode: "rag", sources })` where `sources` is derived from the returned chunks (id, preview, similarity, source).
  - On failure: if the error message includes `"Ollama"`, responds with `503` and a message asking to ensure Ollama is running and the model is pulled; otherwise `500` with the error message.

---

## 3. RAG service (orchestration)

### General

The RAG service is the “brain” of the chatbot flow. It takes the user’s question and: (1) converts the question into a vector (embedding), (2) finds the most relevant stored text chunks, (3) builds one big prompt that contains “Context” (those chunks) and “User Message” (the question), (4) sends that prompt plus a fixed “system” instruction set to the LLM, and (5) returns the model’s answer and the list of chunks that were used so the UI can show “sources.”

### Technical

- **File:** `backend/services/ragService.js`
- **Dependencies:** `getEmbedding`, `findSimilarChunks` from `vectorUtils`.
- **Config (env):** `OLLAMA_URL` (default `http://localhost:11434`), `CHAT_MODEL` (default `llama3.2`), `RAG_RETRIEVAL_LIMIT` (default `3`), `RAG_SIMILARITY_THRESHOLD` (optional 0–1 float to filter out low-similarity chunks).
- **System prompt:** A constant string `SYSTEM_PROMPT` that defines the assistant as a “Security Analyst Assistant,” restricts answers to SQLi, XSS, RFI, LFI, and gives rules (use only retrieved context, don’t mention sources, don’t hallucinate, etc.).
- **`buildPrompt(userQuery, contextChunks)`:** Formats chunks with `[Source: …]` and joins them with `---`; returns a string:
  - `Context:\n<chunks or "(No relevant context found.)">\n\nUser Message:\n<userQuery>\n\nAnswer:\n`
- **`generateWithOllama(prompt, systemPrompt)`:** POSTs to `OLLAMA_URL/api/generate` with body `{ model, prompt, system: systemPrompt, stream: false }`, then returns `data.response.trim()` or throws on non-OK.
- **`chatWithKnowledge(userQuery, options)`:**
  1. Validates `userQuery` (required, non-empty string).
  2. `embedding = await getEmbedding(userQuery.trim())`.
  3. `chunks = await findSimilarChunks(embedding, { sourceType: "knowledge", limit, minSimilarity })`.
  4. `prompt = buildPrompt(userQuery.trim(), chunks)`.
  5. `answer = await generateWithOllama(prompt)`.
  6. Returns `{ answer, chunks }` with chunks mapped to `{ id, content, similarity, source: metadata.source }`.

---

## 4. Embeddings (turning text into vectors)

### General

An embedding is a numerical representation of text so that “similar” questions and paragraphs end up close together in a mathematical space. The chatbot converts the user’s question into such a vector, then the database finds stored paragraphs whose vectors are closest to it—that’s “semantic search” without keyword matching.

### Technical

- **File:** `backend/services/vectorUtils.js`
- **Model:** `EMBEDDING_MODEL` from env, default `nomic-embed-text`. Dimension `EMBEDDING_DIM = 768` (must match the model and DB column).
- **`getEmbedding(text)`:**
  - Truncates input to `MAX_LENGTH = 8000` characters to respect model limits.
  - POSTs to `OLLAMA_URL/api/embeddings` with body `{ model: EMBEDDING_MODEL, prompt: truncated }`.
  - Expects response `{ embedding }` as an array of 768 floats; throws if missing or wrong length.
- Used both at **query time** (user message → one vector) and at **ingestion time** (each chunk → one vector, see below).

---

## 5. Vector store and similarity search (database)

### General

All “knowledge” the chatbot can use is stored as many small text pieces (chunks), each with its own embedding in the database. When you send a question, its embedding is compared to all stored vectors; the database returns the few chunks that are “nearest” (most similar), so the LLM only sees the most relevant text.

### Technical

- **Storage:** PostgreSQL with the pgvector extension. Table `DocumentChunk` (see `backend/prisma/schema.prisma` and migrations):
  - `id` (UUID), `content` (text), `embedding` (vector, 768 dimensions), `sourceType` (`"knowledge"` or `"report"`), `reportId`, `scanId`, `metadata` (JSONB), `createdAt`.
  - Indexes: HNSW on `embedding` for fast approximate nearest-neighbor (cosine), plus indexes on `sourceType`, `scanId`, `reportId`, `createdAt`.
- **`embeddingToVectorLiteral(embedding)`:** Converts `[f1, f2, …]` to the string `"[f1,f2,...]"` for raw SQL.
- **`findSimilarChunks(queryEmbedding, options)`:** Builds a parameterized query that:
  - Uses the cosine distance operator `<=>` on `embedding` vs `$1::vector`.
  - Optionally filters by `sourceType`, `scanId`, `reportId`, and optionally enforces `(1 - distance) >= minSimilarity`.
  - Orders by `embedding <=> $1::vector` and `LIMIT`s.
  - Returns rows with `id`, `content`, `sourceType`, `reportId`, `scanId`, `metadata`, `distance`, and `similarity = 1 - distance`.
- **Chatbot usage:** Always passes `sourceType: "knowledge"` so only global knowledge docs are searched (not per-scan report chunks).
- **`storeChunk` / `storeChunks`:** Used when populating the knowledge base or ingesting reports: compute (or receive) embedding, insert one row per chunk with `content`, `embedding`, `sourceType`, optional `reportId`/`scanId`, `metadata`.

---

## 6. Chunking (splitting documents into pieces)

### General

Long documents can’t be sent in full to the embedding model or the LLM. They are split into overlapping segments (chunks) so that each piece is small enough to embed and retrieve, while overlap keeps context across boundaries (e.g. a sentence that spans two chunks is still represented).

### Technical

- **File:** `backend/services/chunking.js`
- **Defaults:** `DEFAULT_CHUNK_SIZE = 600` characters, `DEFAULT_OVERLAP = 100`.
- **`splitIntoChunks(text, options)`:** Slides a window of `chunkSize` over the text; when possible, breaks at the last newline or “. ” in the window (so chunks don’t cut sentences awkwardly). Next chunk starts at `end - overlap` to create overlap. Returns an array of non-empty strings.
- **`splitMarkdownIntoChunks(md, options)`:** Splits first by markdown `##` headers so that sections stay together when they’re small; for sections longer than `chunkSize`, falls back to `splitIntoChunks` on that section. Used for the security docs (`.md` files).
- **Used by:** Knowledge ingestion (see below) and report ingestion (report text is chunked before embedding and storing).

---

## 7. Knowledge base (how the chatbot’s “memory” is filled)

### General

The chatbot doesn’t learn from conversations. Its factual content comes from a one-time (or periodic) ingestion step: markdown files in a “security docs” folder are read, split into chunks, each chunk is embedded with the same Ollama embedding model, and the chunks are stored in the vector DB with a “knowledge” tag. Those chunks are what get retrieved when the user asks a question.

### Technical

- **Script:** `backend/scripts/ingestKnowledge.js` (run with `node scripts/ingestKnowledge.js` from the backend directory).
- **Input:** All `.md` files in `backend/docs/security/` (e.g. SQLi, XSS, LFI, RFI docs).
- **Process:** For each file, content is read from disk; `splitMarkdownIntoChunks(content)` produces chunks; each chunk is pushed to an array with `sourceType: "knowledge"`, `metadata: { source: filename, topic: basename without .md }`, no `scanId`/`reportId`.
- **Storage:** `storeChunks(allChunks)` is called once; it embeds each chunk sequentially (to avoid overloading Ollama/memory) and inserts rows into `DocumentChunk`. No deletion of existing knowledge chunks in this script—running it again will add more rows (duplicates if filenames/content unchanged).
- **Requires:** Ollama running with the embedding model (e.g. `nomic-embed-text`) and DB migrated with the `DocumentChunk` table and vector column.

---

## 8. LLM generation (Ollama)

### General

The actual answer text is produced by a local language model (e.g. Llama) via Ollama. The backend sends two things: (1) a **system prompt** that defines the assistant’s role and rules (e.g. “Security Analyst Assistant”, only answer about SQLi/XSS/RFI/LFI, don’t mention sources), and (2) a **user prompt** that contains the retrieved context and the user’s question. The model generates a reply conditioned on both; that reply is the chatbot’s answer.

### Technical

- **API:** Ollama’s `POST /api/generate`.
- **Body:** `{ model: CHAT_MODEL, prompt, system: systemPrompt, stream: false }`. `prompt` is the output of `buildPrompt` (Context + User Message + “Answer:”). `systemPrompt` is the constant `SYSTEM_PROMPT` in `ragService.js` (or an override if `generateWithOllama` is called with a second argument).
- **Response:** JSON with `response` (the generated string). The service trims and returns it; no conversation history is sent—each request is stateless.

---

## 9. End-to-end flow (one request)

**General:** User types a question → frontend sends it to the backend → backend turns the question into a vector and finds the closest knowledge chunks → builds a prompt with those chunks and the question → asks Ollama for an answer with a fixed system prompt → returns the answer and source info → frontend shows the answer and optional “sources.”

**Technical (step by step):**

1. **Frontend:** `Chat.jsx` → `api("POST", "/api/chat", { message: text })` (e.g. `POST http://localhost:5000/api/chat`).
2. **Backend:** `chatRoutes` → `chatController.chat` → validates `message`, calls `chatWithKnowledge(message.trim())`.
3. **RAG:** `ragService.chatWithKnowledge`:
   - `getEmbedding(userQuery)` → `OLLAMA_URL/api/embeddings` → 768-dim vector.
   - `findSimilarChunks(embedding, { sourceType: "knowledge", limit: 3, … })` → SQL on `DocumentChunk` with cosine distance, returns top-k rows with `content`, `metadata`, `similarity`.
   - `buildPrompt(userQuery, chunks)` → single string: Context (chunks) + User Message + “Answer:”.
   - `generateWithOllama(prompt)` → `OLLAMA_URL/api/generate` with `system: SYSTEM_PROMPT`, `prompt`, `stream: false` → `answer`.
   - Returns `{ answer, chunks }`.
4. **Controller:** Maps chunks to `sources` (id, preview, similarity, source), sends `res.json({ answer, mode: "rag", sources })`.
5. **Frontend:** Appends `{ role: "assistant", content: data.answer, sources: data.sources }`, shows message and optional source details.

---

## 10. Summary table (what lives where)

| Part | General role | Where it is (file / tech) |
|------|----------------|----------------------------|
| Chat UI | User types, sees messages and “sources” | `frontend/src/Pages/Chat.jsx` |
| API client | Sends POST with `message`, handles errors | `frontend/src/api/api.js` |
| Chat route | Exposes POST /api/chat | `backend/routes/chatRoutes.js`, `server.js` |
| Chat controller | Validates body, calls RAG, returns JSON | `backend/controller/chatController.js` |
| RAG orchestration | Embed query → retrieve chunks → build prompt → call LLM | `backend/services/ragService.js` |
| System prompt | Defines assistant role and rules | Constant in `ragService.js` |
| Embeddings | Text → 768-d vector | `vectorUtils.getEmbedding`, Ollama `/api/embeddings` |
| Vector store | Store/retrieve chunks by similarity | `DocumentChunk` + pgvector, `vectorUtils` |
| Chunking | Split docs into overlapping segments | `backend/services/chunking.js` |
| Knowledge ingest | MD files → chunks → embed → DB | `backend/scripts/ingestKnowledge.js` |
| LLM | Generate answer from context + question | Ollama `/api/generate`, `ragService.generateWithOllama` |

That’s the full A-to-Z of what is used to build the SecuScan chatbot, in both general and technical terms.
