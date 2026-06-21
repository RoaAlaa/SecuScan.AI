const router = require("express").Router();
const { chat } = require("../controller/chatController");
const optionalAuth = require("../middleware/optionalAuth");

router.post("/", optionalAuth, chat);

module.exports = router;
