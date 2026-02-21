const router = require("express").Router();
const { startScan, getMyScans, getPendingScans } = require("../controller/scanController");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuth = require("../middleware/optionalAuth");

router.post("/", optionalAuth, startScan);
router.get("/", authMiddleware, getMyScans);
router.get("/pending", authMiddleware, getPendingScans);

module.exports = router;
