const router = require("express").Router();
const { getReport } = require("../controller/reportController");
const optionalAuth = require("../middleware/optionalAuth");

router.get("/:scanId", optionalAuth, getReport);

module.exports = router;
