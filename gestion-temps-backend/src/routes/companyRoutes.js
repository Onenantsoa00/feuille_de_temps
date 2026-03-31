const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/requireRole");

const {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} = require("../controllers/companyController");

router.get("/", verifyToken, getCompanies);
router.post(
  "/",
  verifyToken,
  requireRole("admin", "secretaire"),
  createCompany
);
router.put(
  "/:id",
  verifyToken,
  requireRole("admin", "secretaire"),
  updateCompany
);
router.delete(
  "/:id",
  verifyToken,
  requireRole("admin", "secretaire"),
  deleteCompany
);

module.exports = router;
