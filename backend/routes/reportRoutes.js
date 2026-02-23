const router = require("express").Router();
const { getReport, saveReport } = require("../controller/reportController");
const optionalAuth = require("../middleware/optionalAuth");

router.post("/", saveReport);
router.get("/:scanId", optionalAuth, getReport);

module.exports = router;
