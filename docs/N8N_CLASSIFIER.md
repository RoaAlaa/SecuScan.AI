# n8n Classifier Webhook for Chat Routing

The chat API uses an n8n webhook + Gemini to classify each message as **RAG** (technical/security question) or **LLM** (general/greeting). The backend then routes to RAG (knowledge base) or a simple LLM with a different prompt.

---

## Flow

```
User message → Backend POST /api/chat
             → Backend calls n8n webhook (POST { message })
             → n8n uses Gemini to classify → returns { mode: "RAG" | "LLM" }
             → Backend: if RAG → chatWithKnowledge(); if LLM → chatWithLLM()
             → Response { answer, mode, sources }
```

---

## Webhook Contract

### Request (backend → n8n)

| Method | Content-Type | Body |
|--------|--------------|------|
| POST   | application/json | `{ "message": "user's question" }` |

### Response (n8n → backend)

Return JSON:

```json
{ "mode": "RAG" }
```

or

```json
{ "mode": "LLM" }
```

- **RAG**: Technical/security question → backend runs RAG (knowledge retrieval + Ollama).
- **LLM**: General question, greeting, or casual chat → backend runs Ollama with the general-assistant prompt (1–2 sentences, brief, redirects to security topics).

Any other value or missing `mode` is treated as **RAG**.

---

## n8n Workflow (outline)

1. **Webhook** – Trigger on POST.
2. **HTTP Request** or **Code** – Extract `message` from body.
3. **Gemini** – Prompt, e.g.:

   ```
   You classify whether a user message needs technical security knowledge (RAG) or is general/greeting/casual (LLM).

   RAG = technical questions about vulnerabilities, security concepts, exploits, SQL injection, XSS, etc.
   LLM = greetings, "how are you", casual chat, non-technical questions.

   Reply with ONLY one word: RAG or LLM.

   User message: {{ $json.message }}
   ```

4. **Respond to Webhook** – Return `{ "mode": "<RAG or LLM>" }` (uppercase or lowercase both work).

---

## Configuration

| Env var | Description | Default |
|---------|-------------|---------|
| `N8N_CLASSIFIER_WEBHOOK_URL` | n8n webhook URL | — (if unset, all messages go to RAG) |
| `CLASSIFIER_TIMEOUT_MS` | Timeout for classifier call (ms) | `15000` |

Example (local n8n):
```bash
N8N_CLASSIFIER_WEBHOOK_URL=http://localhost:5678/webhook/classify
```

If the webhook URL is not set, the backend skips classification and always uses **RAG** (backward compatible).

If the webhook fails (timeout, error, non-2xx), the backend defaults to **RAG**.
