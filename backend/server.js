const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const users = new Map();

app.post("/api/register", (req, res) => {
  const { name, email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  if (users.has(normalizedEmail)) {
    return res.status(409).json({ error: "Email already registered" });
  }
  users.set(normalizedEmail, {
    name: (name || "").trim() || "User",
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ success: true, message: "Registered. Please login." });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = users.get(normalizedEmail);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  res.json({ success: true, user: { name: user.name, email: user.email } });
});

app.get("/api/report", (req, res) => {
  fs.readFile("./report.json", "utf8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Failed to load report" });
    }

    res.json(JSON.parse(data));
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
