const express = require("express");
const router = express.Router();

const {
  createUser,
  getUsers,
  getPendingEmployees,
  validateEmployee,
} = require("../controllers/userController");
const { login } = require("../controllers/authController");
const verifyToken = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/requireRole");
const {
  validateCreateUserRole,
} = require("../middlewares/validateCreateUserRole");

router.post("/login", login);

router.get("/users", verifyToken, getUsers);
router.post(
  "/users",
  verifyToken,
  requireRole("admin", "secretaire", "chef_mission"),
  validateCreateUserRole,
  createUser
);
router.get(
  "/users/pending-employee-validations",
  verifyToken,
  requireRole("admin"),
  getPendingEmployees
);
router.put(
  "/users/:id/validate",
  verifyToken,
  requireRole("admin"),
  validateEmployee
);

router.get("/profile", verifyToken, (req, res) => {
  res.json({
    message: "Profil sécurisé",
    user: req.user,
  });
});

module.exports = router;
