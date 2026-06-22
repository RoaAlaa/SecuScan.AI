# Vulnerability: Server-Side Request Forgery (SSRF)

## 1. Overview and Definition
Server-Side Request Forgery (SSRF) is a web vulnerability that occurs when a web application fetches a remote resource without validating the user-supplied URL. Also referred to as server-side request forgery or SSRF attacks. It allows an attacker to coerce the server into making HTTP or network requests to an arbitrary domain of the attacker's choosing. 

Unlike Client-Side Request Forgery (CSRF) which targets the user, SSRF targets the server itself. By abusing the server's network access, an attacker can bypass firewalls and interact with internal, non-public systems that are usually isolated from the outside internet.

---

## 2. How It Happens (The Mechanism)
SSRF typically arises in features that require the application to fetch external data to process it. Common website features susceptible to SSRF include:
*   **Webhooks:** Allowing users to specify a URL where the application will send callbacks.
*   **File/Image Imports:** Features like "Upload from URL" or rendering PDF documents from user-supplied web links.
*   **Link Previews:** Automatically generating thumbnails or metadata summaries when a user pastes a link into a chat or forum.
*   **API Integrations:** Passing a target API endpoint as a parameter in a microservice architecture.

If the application takes the user's URL (e.g., `https://example.com/image.jpg`) and makes a server-side HTTP request to it without strict validation, the attacker can swap that URL for an internal address (e.g., `http://localhost/admin` or `http://169.254.169.254/`).

---

## 3. Types of SSRF
The chatbot can explain SSRF based on how the server handles the response:

### A. Basic (In-Band) SSRF
The application returns the data fetched from the illicit request directly to the attacker in the frontend. 
*   **Example:** An attacker inputs an internal database URL. The application fetches the internal database dashboard and displays the HTML to the attacker on the website.

### B. Blind SSRF
The application triggers the backend network request, but the HTTP response is not returned to the user's screen. 
*   **Impact:** Harder to exploit for direct data exfiltration, but it can still be used to map internal network infrastructure (via time delays or error codes) or trigger state-changing actions on internal REST APIs that do not require authentication.

---

## 4. Business Impact
A successful SSRF attack can be catastrophic, particularly in cloud environments. It can lead to:
*   **Access to Internal Services:** Bypassing perimeter firewalls to access internal administrative panels, databases, or Redis instances.
*   **Cloud Metadata Exfiltration:** In AWS, Azure, or GCP environments, attackers often target the instance metadata service (e.g., `http://169.254.169.254/latest/meta-data/`) to steal highly privileged IAM cloud credentials.
*   **Port Scanning:** Using the server as a proxy to scan the internal network for open ports and vulnerable services.

---

## 5. Prevention and Mitigation Best Practices
When answering questions about how to fix SSRF, the chatbot should recommend the following defense-in-depth strategies:

1.  **Enforce Strict Allow-lists (Primary Defense):**
    *   Instead of trying to block bad URLs (deny-lists are easily bypassed via IP encoding or DNS rebinding), the application must validate the input against a strict allow-list of permitted domains, hostnames, or IP addresses.
2.  **Disable HTTP Redirections:**
    *   An attacker might bypass an allow-list by providing a permitted URL that immediately redirects to an internal IP. The HTTP client library used by the server must be configured to *not* follow redirects automatically.
3.  **Network Segregation & Egress Filtering:**
    *   Isolate the service that fetches URLs into its own restricted network segment. Use firewall rules to block outbound traffic to internal IP spaces (e.g., `127.0.0.0/8`, `10.0.0.0/8`, `192.168.0.0/16`) from that specific server.
4.  **Protect Cloud Metadata:**
    *   If hosted in AWS, migrate from IMDSv1 to IMDSv2, which requires a specific HTTP header (`X-aws-ec2-metadata-token`) to retrieve credentials, breaking most SSRF attack vectors.

---

## 6. Trusted References & Further Reading
* **OWASP – Server-Side Request Forgery:** [https://owasp.org/www-community/attacks/Server_Side_Request_Forgery](https://owasp.org/www-community/attacks/Server_Side_Request_Forgery)
* **PortSwigger Web Security Academy – SSRF:** [https://portswigger.net/web-security/ssrf](https://portswigger.net/web-security/ssrf)