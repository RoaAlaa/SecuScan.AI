const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
const prisma = require("./prismaClient");

app.get("/test-db", async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

const authRoutes = require("./routes/authRoutes");
const scanRoutes = require("./routes/scanRoutes");
const reportRoutes = require("./routes/reportRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/scans", scanRoutes);
app.use("/api/report", reportRoutes);

app.get("/", (req, res) => {
  res.send("API Running...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});