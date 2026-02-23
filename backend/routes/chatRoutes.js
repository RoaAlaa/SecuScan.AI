const router = require("express").Router();
const { chat } = require("../controller/chatController");

router.post("/", chat);

module.exports = router;
