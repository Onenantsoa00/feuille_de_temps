const express = require("express");
const router = express.Router();

const { createUser, getUsers } = require("../controllers/userController");
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
  requireRole("admin", "secretaire"),
  validateCreateUserRole,
  createUser
);

router.get("/profile", verifyToken, (req, res) => {
  res.json({
    message: "Profil sécurisé",
    user: req.user,
  });
});

module.exports = router;
