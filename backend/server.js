const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = 3000;

app.use(cors());


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
