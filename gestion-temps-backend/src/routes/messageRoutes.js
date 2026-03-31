const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/authMiddleware");
const messageController = require("../controllers/messageController");

router.get("/conversations", verifyToken, messageController.conversations);
router.get("/thread/:userId", verifyToken, messageController.thread);
router.post("/send", verifyToken, messageController.send);

module.exports = router;
