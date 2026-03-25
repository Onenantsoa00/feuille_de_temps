const express = require("express");
const cors = require("cors");
const pool = require("./config/db"); // 👈 remonter ici

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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
const userRoutes = require("./routes/userRoutes");

app.use("/api/users", userRoutes);
