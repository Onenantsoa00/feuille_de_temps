const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/requireRole");

const {
  getCases,
  createCase,
  setAssignments,
  getAssignments,
  getPendingCases,
  validateCase,
} = require("../controllers/caseController");

router.get("/", verifyToken, getCases);
router.post(
  "/",
  verifyToken,
  requireRole("admin", "secretaire"),
  createCase,
);
router.get(
  "/pending-validation",
  verifyToken,
  requireRole("admin"),
  getPendingCases
);
router.put("/:id/validate", verifyToken, requireRole("admin"), validateCase);
router.get("/:id/assignments", verifyToken, getAssignments);
router.put("/:id/assignments", verifyToken, setAssignments);

module.exports = router;
