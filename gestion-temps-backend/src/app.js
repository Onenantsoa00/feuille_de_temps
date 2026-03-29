const express = require("express");
const cors = require("cors");
const pool = require("./config/db"); // 👈 remonter ici
const userRoutes = require("./routes/userRoutes");
const taskRoutes = require("./routes/taskRoutes");
const workHourRoutes = require("./routes/workHourRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const syncRoutes = require("./routes/syncRoutes");
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/work-hours", workHourRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/sync", syncRoutes);
// Route test
app.get("/", (req, res) => {
  res.send("API fonctionne !");
});

// Test DB
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (error) {
    console.error("ERREUR DB :", error);
    res.status(500).json({
      message: "Erreur DB",
      error: error.message,
    });
  }
});

module.exports = app;
