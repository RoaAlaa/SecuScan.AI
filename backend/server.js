const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const app = express();

app.use(cors());
app.use(
  express.json({
    limit: "2mb",
    type: ["application/json", "application/*+json", "json"],
  })
);
app.use(express.urlencoded({ extended: true }));

// Handle invalid JSON bodies with a clear 400
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error:
        "Invalid JSON body. Send Content-Type: application/json and a valid JSON payload.",
    });
  }
  return next(err);
});
const prisma = require("./prismaClient");

app.get("/test-db", async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

const authRoutes = require("./routes/authRoutes");
const scanRoutes = require("./routes/scanRoutes");
const reportRoutes = require("./routes/reportRoutes");
const chatRoutes = require("./routes/chatRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/scans", scanRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/chat", chatRoutes);

app.get("/", (req, res) => {
  res.send("API Running...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});