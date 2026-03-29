const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authMiddleware");
const workHourController = require("../controllers/workHourController");

router.post("/", verifyToken, workHourController.createWorkHour);
router.get("/", verifyToken, workHourController.getWorkHours);

module.exports = router;