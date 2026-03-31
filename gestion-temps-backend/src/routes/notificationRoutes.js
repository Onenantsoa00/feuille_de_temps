const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/requireRole");
const notificationController = require("../controllers/notificationController");

router.get("/", verifyToken, notificationController.list);
router.get("/unread-count", verifyToken, notificationController.unreadCount);
router.patch("/:id/read", verifyToken, notificationController.markRead);
router.post("/mark-all-read", verifyToken, notificationController.markAllRead);
router.post(
  "/",
  verifyToken,
  requireRole("admin", "secretaire"),
  notificationController.createForUser
);

module.exports = router;
