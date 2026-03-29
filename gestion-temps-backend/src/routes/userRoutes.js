const express = require("express");
const router = express.Router();

const { createUser, getUsers } = require("../controllers/userController");
const { login } = require("../controllers/authController");
const verifyToken = require("../middlewares/authMiddleware");


router.post("/users", createUser);
router.get("/users", getUsers);
router.post("/login", login);

router.get("/profile", verifyToken, (req, res) => {
    res.json({
      message: "Profil sécurisé",
      user: req.user,
    });
  });

module.exports = router;
