const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/requireRole");

const {
  getCases,
  createCase,
  updateCase,
  setAssignments,
  getAssignments,
  getPendingCases,
  validateCase,
  finishCase,
} = require("../controllers/caseController");

router.get("/", verifyToken, getCases);
router.post(
  "/",
  verifyToken,
  requireRole("admin", "expert_comptable", "secretaire"),
  createCase,
);
router.put(
  "/:id",
  verifyToken,
  requireRole("admin", "expert_comptable", "secretaire"),
  updateCase,
);
router.get(
  "/pending-validation",
  verifyToken,
  requireRole("admin"),
  getPendingCases
);
router.put(
  "/:id/validate",
  verifyToken,
  requireRole("admin"),
  validateCase
);
router.put("/:id/finish", verifyToken, requireRole("admin"), finishCase);
router.get("/:id/assignments", verifyToken, getAssignments);
router.put("/:id/assignments", verifyToken, setAssignments);

module.exports = router;
