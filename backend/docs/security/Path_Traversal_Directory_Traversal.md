# Vulnerability: Path Traversal (Directory Traversal)

## 1. Overview and Definition
Path Traversal (also known as Directory Traversal, dot-dot-slash, or directory climbing) is a vulnerability that allows an attacker to read arbitrary files on the server running the web application. This might include application code, credentials for backend systems, and sensitive operating system files. 

It occurs when user-supplied input is passed to filesystem APIs without proper validation or normalization.

---

## 2. How It Happens (The Mechanism)
Web applications often need to read files from the disk, such as loading images or downloading user manuals. If the application takes a file name directly from a user parameter, an attacker can manipulate it using "dot-dot-slash" (`../`) sequences to step out of the intended web root directory and traverse the server's file system.

**Example:**
An application loads profile pictures using the URL:
`https://example.com/loadImage?filename=profile.jpg`

The backend code might be: `open("/var/www/images/" + filename)`

If the attacker changes the URL to:
`https://example.com/loadImage?filename=../../../etc/passwd`

The backend resolves the path to `/var/www/images/../../../etc/passwd`, which normalizes to `/etc/passwd`. The server then reads and returns the Linux password file to the attacker.

---

## 3. Business Impact
* **Sensitive Data Exposure:** Attackers can read configuration files containing database passwords, API keys, and cloud infrastructure credentials.
* **Source Code Theft:** Attackers can read the application's source code to find further vulnerabilities or steal intellectual property.
* **Remote Code Execution (RCE):** In certain scenarios, if the application also has a file upload feature that is vulnerable to path traversal, an attacker could write a malicious script to an executable directory, leading to complete server compromise.

---

## 4. Prevention and Mitigation
1.  **Avoid Direct File Access:** The best defense is to completely avoid passing user-supplied input directly to filesystem APIs. Use indirect references instead (e.g., an integer ID mapped to a file path in a database).
2.  **Validate Against an Allow-List:** If indirect references aren't possible, validate the input strictly against a list of permitted filenames.
3.  **Strict Input Validation:** Ensure the user input contains only permitted characters (e.g., purely alphanumeric characters) and completely reject input containing `/`, `\`, or `.` characters.
4.  **Path Normalization and Verification:** If dynamic file loading is required, developers must normalize the path and verify that the final destination resides within the intended directory.
    * *Node.js Example:*
        ```javascript
        const path = require('path');
        const rootDir = '/var/www/images/';
        const securePath = path.resolve(rootDir, userInput);
        if (!securePath.startsWith(rootDir)) { throw new Error("Path traversal detected"); }
        ```

---

## 5. Detection and Testing
* **Payload Injection:** Pentesters inject various encoding combinations of `../` into every parameter that seems to interact with the file system (e.g., `file=`, `document=`, `image=`).
* **Filter Evasion:** If the server strips `../` linearly, attackers might use nested payloads like `....//` or URL-encoded variations (`%2e%2e%2f` or `%252e%252e%252f`) to bypass weak Web Application Firewalls (WAFs).
* **Target Files:** Common proof-of-concept targets include `/etc/passwd` (Linux) or `C:\Windows\win.ini` (Windows).

---

## 6. Trusted References & Further Reading
* **OWASP Path Traversal:** [https://owasp.org/www-community/attacks/Path_Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
* **PortSwigger Web Security Academy - Directory Traversal:** [https://portswigger.net/web-security/file-path-traversal](https://portswigger.net/web-security/file-path-traversal)