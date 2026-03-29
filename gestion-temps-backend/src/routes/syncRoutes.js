const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/authMiddleware");
const { syncWorkHours } = require("../controllers/syncController");

router.post("/work-hours", verifyToken, syncWorkHours);

module.exports = router;