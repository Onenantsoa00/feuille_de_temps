const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/requireRole");
const dashboardController = require("../controllers/dashboardController");

router.get("/", verifyToken, dashboardController.getDashboard);
router.get(
  "/reports/missions",
  verifyToken,
  requireRole("admin", "expert_comptable"),
  dashboardController.getMissionReports
);
router.get(
  "/reports/collaborateurs",
  verifyToken,
  requireRole("admin", "expert_comptable"),
  dashboardController.getCollaboratorReports
);

module.exports = router;