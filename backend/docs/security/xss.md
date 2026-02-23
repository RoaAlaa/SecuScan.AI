# Cross-Site Scripting (XSS)

## What It Is

XSS lets an attacker inject client-side scripts (usually JavaScript) into pages that other users view. The script runs in the victim’s browser with the site’s origin, so it can access cookies, session tokens, and DOM.

## Types

- **Stored XSS:** Malicious script is saved (e.g. in DB) and served to users (e.g. comments, profiles).
- **Reflected XSS:** Script is in the request (e.g. query, fragment) and echoed in the response without storage.
- **DOM-based XSS:** Vulnerability is in client-side code that writes unsanitized data to the DOM.

## Impact

- Session hijacking, cookie theft.
- Defacement, phishing, keylogging.
- Actions performed as the victim user (if session/cookies are sent).

## Prevention

- **Output encoding:** Encode data for the correct context (HTML, attribute, URL, JavaScript). Use a library; avoid building HTML with string concatenation.
- **Content Security Policy (CSP):** Restrict script sources and inline script to reduce impact of XSS.
- **Input validation:** Reject or sanitize input; use allowlists for format and length.
- For rich content, use a safe subset (e.g. DOMPurify) and avoid `innerHTML` with raw user input.

## Detection

- Scanners and manual tests inject `<script>`, event handlers (`onerror=`, `onload=`), and payloads in every input and reflected output.
