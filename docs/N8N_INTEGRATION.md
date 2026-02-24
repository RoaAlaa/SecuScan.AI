# n8n Workflow Integration

This document describes how SecuScan.AI integrates with n8n to run security scans and create reports.

## Flow Overview

```
┌─────────────┐    1. User enters URL, clicks Scan     ┌─────────────┐
│   Frontend  │ ──────────────────────────────────────▶│   Backend   │
└─────────────┘                                        └──────┬──────┘
                                                               │
                    2. Create Scan in DB (status: pending)      │
                    3. POST to n8n webhook                     │
                                                               ▼
┌─────────────┐    4. n8n receives scan request        ┌─────────────┐
│     n8n     │ ◀──────────────────────────────────────│  (fire &    │
│  Workflow   │     { scanId, targetUrl, callbackUrl } │   forget)   │
└──────┬──────┘                                        └─────────────┘
       │
       │ 5. Run security scan (e.g. OWASP ZAP, custom scripts, etc.)
       │
       ▼
┌─────────────┐    6. POST results to callbackUrl      ┌─────────────┐
│   Backend   │ ◀──────────────────────────────────────│     n8n     │
│ POST /api/  │     { scanId, type, severity, details }│  (HTTP node)│
│   report    │                                        └─────────────┘
└──────┬──────┘
       │ 7. Save report, update scan status, ingest for RAG
       ▼
  Report is available in UI & History
```

## Backend Configuration

Add to your `backend/.env`:

```env
# n8n workflow webhook URL (from n8n Webhook node "Production" or "Test" URL)
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-path

# Backend base URL (used to build the callback URL n8n will POST to)
# Required so n8n knows where to send results
BACKEND_URL=https://your-api.com
# Or for local dev:
BACKEND_URL=http://localhost:5000
```

If `N8N_WEBHOOK_URL` is not set, scans will still be created in the database but no workflow will be triggered (graceful degradation).

## n8n Workflow Setup

### 1. Create a Webhook Trigger

- Add a **Webhook** trigger node
- Method: **POST**
- Path: Choose a path (e.g. `secuscan-scan`)
- Your webhook URL will be: `https://<n8n-host>/webhook/<path>` or `https://<n8n-host>/webhook-test/<path>` for testing

Copy the production webhook URL and set it as `N8N_WEBHOOK_URL` in your backend `.env`.

### 2. Payload SecuScan Sends to n8n

The backend POSTs this JSON when a scan starts:

```json
{
  "scanId": "uuid-of-the-scan",
  "targetUrl": "https://example.com",
  "callbackUrl": "https://your-api.com/api/report",
  "email": "user@example.com"
}
```

- `scanId` – Use this when posting the report back.
- `targetUrl` – The URL to scan.
- `callbackUrl` – POST the final report to this URL.
- `email` – Present only for guest scans; use it for email notifications if needed.

### 3. Run Your Security Scan

Add nodes to perform the actual scan, for example:

- **HTTP Request** – Call OWASP ZAP API, Nuclei, or another scanner
- **Code** – Run custom scanning logic
- **Execute Command** – Run CLI tools (e.g. `sqlmap`, `nikto`)

Use `$json.targetUrl` and `$json.scanId` from the webhook input.

### 4. Post Results Back to SecuScan

Add an **HTTP Request** node at the end of your workflow:

- **Method**: POST
- **URL**: `{{ $json.callbackUrl }}` (or `{{ $('Webhook').item.json.callbackUrl }}`)
- **Headers**: `Content-Type: application/json`
- **Body (JSON)**:

```json
{
  "scanId": "{{ $('Webhook').item.json.scanId }}",
  "type": "scan",
  "severity": "medium",
  "details": {
    "summary": "Scan completed. Found 3 vulnerabilities.",
    "vulnerabilities": [
      {
        "name": "SQL Injection",
        "severity": "high",
        "description": "..."
      }
    ]
  }
}
```

### 5. Report Payload Format

The `details` object is flexible JSON. Common structure:

| Field | Type | Description |
|-------|------|-------------|
| `scanId` | string | **Required.** Must match the scan created by SecuScan. |
| `type` | string | Optional. Default `"scan"`. |
| `severity` | string | Optional. One of: `critical`, `high`, `medium`, `low`, `unknown`. Default `"unknown"`. |
| `details` | object | **Required.** Arbitrary JSON (vulnerabilities, summary, findings, etc.). |

Example minimal payload:

```json
{
  "scanId": "abc-123",
  "type": "scan",
  "severity": "low",
  "details": {
    "summary": "No critical issues found.",
    "findings": []
  }
}
```

## Example n8n Workflow (Conceptual)

1. **Webhook** – Receives POST from SecuScan
2. **Set** – Store `targetUrl`, `scanId`, `callbackUrl` in variables
3. **HTTP Request** – Call your scanner API with `targetUrl`
4. **Code** – Transform scanner output into SecuScan report format
5. **HTTP Request** – POST to `callbackUrl` with `{ scanId, type, severity, details }`

## Troubleshooting

| Issue | Check |
|-------|-------|
| Workflow never runs | Verify `N8N_WEBHOOK_URL` in `.env` and that the webhook is in production mode. |
| Report not appearing | Ensure n8n POSTs to `callbackUrl` with correct `scanId` and `details` object. |
| Callback fails | `BACKEND_URL` must be reachable from n8n (no `localhost` if n8n runs elsewhere). |
