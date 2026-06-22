# Vulnerability: Server-Side Template Injection (SSTI)

## 1. Overview and Definition
Server-Side Template Injection (SSTI) occurs when user input is unsafely embedded directly into a server-side template, allowing attackers to inject native template engine directives.

Template engines (such as Jinja2, Twig, or Pug) generate dynamic HTML by combining static templates with dynamic data. If an attacker can inject syntax into the template itself, they can execute arbitrary code on the server.

---

## 2. How It Happens (The Mechanism)
SSTI typically arises when developers mistakenly concatenate user input directly into a template string rather than passing the input in as a context variable.

**Vulnerable Example (Python / Jinja2):**
```python
from flask import request, render_template_string

@app.route('/hello')
def hello_ssti():
    person = request.args.get('name')
    # VULNERABLE: user input is concatenated into the template string.
    template = f"<h2>Hello {person}</h2>"
    return render_template_string(template)
```

If an attacker visits `/hello?name={{7*7}}`, the engine parses the syntax and responds with `<h2>Hello 49</h2>`. Once expression evaluation is confirmed, the attacker can leverage built-in runtime objects to escape the application sandbox and execute operating system commands.

---

## 3. Business Impact
SSTI is almost always classified as a critical vulnerability because it frequently leads directly to **Remote Code Execution (RCE)**:
* **Full Server Takeover:** Attackers can execute arbitrary shell commands on the hosting server.
* **Data Breach:** Attackers gain complete access to the application's file system, databases, and underlying environment variables.
* **Internal Network Pivoting:** The compromised server can be used as a beachhead to attack internal networks.

---

## 4. Prevention and Mitigation
1. **Separate Templates from Data (Primary Defense):** Never concatenate template strings using user input. Pass input only via context variables/parameters.

**Safe Example (Python / Jinja2):**
```python
template = "<h2>Hello {{ name }}</h2>"
return render_template_string(template, name=person)
```

2. **Use Logic-less Templates:** If user modification of layout is an explicit business requirement, use engines like Mustache, which strictly separate presentation from execution logic.
3. **Sandboxing:** Execute the template environment in a highly restricted sandbox if dynamic template generation cannot be avoided.

---

## 5. Detection and Testing
* **Fuzzing with Polyglots:** Pentesters inject mathematical character combinations like `${7*7}`, `{{7*7}}`, `<%= 7*7 %>`, or `#{7*7}`.
* **Observation:** If the server resolves the expression and returns `49`, an SSTI vulnerability is present.
* **Engine Identification:** Pentesters use a decision tree of payloads to determine which specific engine is in use based on how specific types of syntax are parsed.

---

## 6. Trusted References & Further Reading
* **PortSwigger Web Security Academy – Server-Side Template Injection:** [https://portswigger.net/web-security/server-side-template-injection](https://portswigger.net/web-security/server-side-template-injection)
