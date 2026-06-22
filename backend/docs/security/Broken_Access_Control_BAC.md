# Vulnerability: Broken Access Control (BAC)

## 1. Overview and Definition
Broken Access Control (BAC) occurs when an application fails to properly enforce restrictions on what authenticated (or unauthenticated) users are allowed to do. Related terms include authorization failures, IDOR (Insecure Direct Object Reference), and privilege escalation. While *Authentication* verifies who the user is, *Authorization* (Access Control) dictates what they are allowed to see or modify. When access control is broken, users can act outside their intended permissions.

This is currently ranked as the #1 vulnerability in the OWASP Top 10 due to how common and impactful it is.

---

## 2. How It Happens (The Mechanism)
Access control vulnerabilities usually occur because authorization rules are either missing entirely, implemented inconsistently, or rely on client-side obfuscation rather than server-side validation.

Common mechanisms include:
* **Insecure Direct Object Reference (IDOR):** The application exposes a direct reference to an internal object (like a database ID) in the URL or form data. An attacker changes the ID (`/api/receipts?id=105` to `/api/receipts?id=106`) and views another user's receipt because the server did not check if the current user actually owns receipt 106.
* **Vertical Privilege Escalation:** A standard user accesses administrative endpoints simply by guessing or knowing the URL (e.g., navigating directly to `/admin/deleteUser` without being logged in as an admin).
* **Horizontal Privilege Escalation:** A user accesses the resources or acts on behalf of another user with the same level of privileges (e.g., User A changing User B's password).
* **Client-Side Bypasses:** Relying on hiding UI buttons (like a "Delete" button) via CSS or JavaScript, but failing to secure the actual API endpoint that the button calls.

---

## 3. Business Impact
* **Unauthorized Information Disclosure:** Exposing sensitive user data, PII, or proprietary business logic.
* **Data Modification and Destruction:** Attackers can tamper with other users' data, delete accounts, or alter financial transactions.
* **Complete System Compromise:** If an attacker achieves vertical privilege escalation and gains administrative rights, they effectively take full control over the application.

---

## 4. Prevention and Mitigation
Access control must be enforced strictly on the server-side in a centralized, trustworthy manner.
1.  **Deny by Default:** Unless a resource is explicitly intended to be public, the application should deny access by default.
2.  **Implement Centralized Authorization:** Do not write access control checks scattered throughout different controllers. Use a unified middleware or access control matrix (e.g., Role-Based Access Control - RBAC, or Attribute-Based Access Control - ABAC).
3.  **Validate Ownership (Fixing IDOR):** When accessing a specific record via an ID, the backend must execute a database query that includes the logged-in user's ID. 
    * *Safe Example:* `SELECT * FROM receipts WHERE id = $1 AND owner_id = $2`
4.  **Do Not Rely on Obfuscation:** Hiding URLs, using unguessable IDs (like UUIDs), or hiding HTML elements is not a substitute for actual server-side permission checks. UUIDs mitigate basic IDOR enumeration, but the access control flaw still exists if the UUID is leaked.

---

## 5. Detection and Testing
* **Matrix Testing:** Pentesters create multiple accounts with different roles (Admin, User A, User B, Unauthenticated). They capture the API requests made by the Admin or User A, and replay those exact requests using the session tokens of User B or the Unauthenticated user to see if the server processes them.
* **Forced Browsing:** Brute-forcing predictable administrative directories (e.g., `/admin`, `/administrator`, `/manager`) and checking for HTTP 200 OK responses instead of 401 Unauthorized or 403 Forbidden.

---

## 6. Trusted References & Further Reading
* **OWASP Top 10: A01:2021 – Broken Access Control:** [https://owasp.org/Top10/2021/A01_2021-Broken_Access_Control/index.html](https://owasp.org/Top10/2021/A01_2021-Broken_Access_Control/index.html)
* **PortSwigger Web Security Academy – Access Control:** [https://portswigger.net/web-security/access-control](https://portswigger.net/web-security/access-control)