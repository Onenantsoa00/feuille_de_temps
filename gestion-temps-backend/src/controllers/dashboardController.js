const dashboardModel = require("../models/dashboardModel");

const getDashboard = async (req, res) => {
  try {
    const global = await dashboardModel.getGlobalStats();
    const users = await dashboardModel.getUserStats();
    const tasks = await dashboardModel.getTaskStats();
    const daily = await dashboardModel.getDailyStats();
    const counts = await dashboardModel.getEntityCounts();
    const hoursByDayCompany = await dashboardModel.getHoursByDayAndCompany();

    res.json({
      global,
      users,
      tasks,
      daily,
      counts,
      hoursByDayCompany,
    });
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