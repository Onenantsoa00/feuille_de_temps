const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authMiddleware");
const dashboardController = require("../controllers/dashboardController");

router.get("/", verifyToken, dashboardController.getDashboard);

module.exports = router;