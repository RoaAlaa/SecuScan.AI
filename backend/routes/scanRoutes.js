const router = require("express").Router();
const { startScan, getMyScans, getPendingScans, deleteScan } = require("../controller/scanController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, startScan);
router.get("/", authMiddleware, getMyScans);
router.get("/pending", authMiddleware, getPendingScans);
router.delete("/:id", authMiddleware, deleteScan);

module.exports = router;
