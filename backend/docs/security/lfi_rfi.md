# LFI and RFI (Local and Remote File Inclusion)

## What They Are

- **LFI (Local File Inclusion):** The application includes or reads a file from the server’s filesystem using a path that is (fully or partly) controlled by the user. An attacker can often read arbitrary local files (e.g. config files, source code, `/etc/passwd`).
- **RFI (Remote File Inclusion):** The application includes or executes a file from a remote URL that is (fully or partly) user-controlled. An attacker can point the app to a malicious URL and get their script executed on the server.

Both are “file inclusion” vulnerabilities; the difference is whether the included path is local or remote.

## How They Happen

- User input (query param, POST field, header) is used to build a file path or URL.
- The app does not validate or restrict the path (e.g. no allowlist, path traversal not blocked).
- For RFI: the app fetches and sometimes executes remote content (e.g. `include()`, `require()`, or equivalent with a URL).

## Impact

**LFI:**
- Read sensitive files (passwords, env, source code).
- If the app later executes included content (e.g. PHP `include`), LFI can become code execution (e.g. by including log files or session files after poisoning them).

**RFI:**
- Execute attacker-controlled code on the server (full RCE in worst case).
- The server fetches and runs code from the attacker’s URL.

## Prevention

- **Avoid including files based on user input.** If you must, use a strict allowlist of allowed filenames (no path traversal, no URLs).
- **Never use user input as the whole path.** Resolve to a fixed base directory and validate that the resolved path stays under it (canonical path check).
- **Disable remote inclusion** if the language supports it (e.g. `allow_url_include = Off` in PHP).
- **Principle of least privilege:** run the app with minimal filesystem and network permissions.

## Detection

- **LFI:** Try path traversal (`../`, `....//`), absolute paths (`/etc/passwd`), and protocol wrappers (e.g. `file://`, `php://filter`) in every parameter that might be used as a path.
- **RFI:** Try `http://evil.com/shell.txt` (or your own URL) in parameters that might be included; check if the server fetches or executes it.

## Summary for the Chatbot

- **SQLi:** User input in SQL queries → use parameterized queries, never concatenate.
- **XSS:** User input reflected/stored and rendered as HTML/JS → encode output, CSP, sanitize.
- **LFI/RFI:** User input used as file path or URL for inclusion → allowlist, no path traversal, disable remote include; validate resolved path.
