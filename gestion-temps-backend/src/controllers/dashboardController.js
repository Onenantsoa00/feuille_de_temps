const dashboardModel = require("../models/dashboardModel");

const getDashboard = async (req, res) => {
  try {
    const data = await dashboardModel.getRoleDashboard({
      userId: req.user.id,
      role: req.user.role,
    });
    res.json(data);
  } catch (error) {
    console.error("DASHBOARD ERROR:", error);
    res.status(500).json({
      message: "Erreur dashboard",
    });
  }
};

module.exports = {
  getDashboard,
};