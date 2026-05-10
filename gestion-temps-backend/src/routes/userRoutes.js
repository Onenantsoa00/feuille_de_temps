const express = require("express");
const router = express.Router();

const {
  createUser,
  getUsers,
  getPendingEmployees,
  validateEmployee,
  changePassword,
  adminChangeUserPassword,
  updateUser,
  getUserMissions,
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
  requireRole(
    "admin",
    "expert_comptable",
    "secretaire",
    "chef_de_mission",
    "chef_mission",
    "chef",
  ),
  validateCreateUserRole,
  createUser,
);
router.get(
  "/users/pending-employee-validations",
  verifyToken,
  requireRole("admin", "expert_comptable"),
  getPendingEmployees,
);
router.put(
  "/users/:id/validate",
  verifyToken,
  requireRole("admin", "expert_comptable"),
  validateEmployee,
);
router.put("/users/change-password", verifyToken, changePassword);
router.put(
  "/users/:id/change-password",
  verifyToken,
  requireRole("admin", "expert_comptable"),
  adminChangeUserPassword,
);
router.get(
  "/users/:id/missions",
  verifyToken,
  requireRole("admin", "expert_comptable"),
  getUserMissions,
);
router.put(
  "/users/:id",
  verifyToken,
  requireRole("admin", "expert_comptable"),
  updateUser,
);

router.get("/profile", verifyToken, (req, res) => {
  res.json({
    message: "Profil sécurisé",
    user: req.user,
  });
});

module.exports = router;
