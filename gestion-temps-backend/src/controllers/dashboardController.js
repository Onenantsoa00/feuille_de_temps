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

const getMissionReports = async (req, res) => {
  try {
    const data = await dashboardModel.getMissionReportsForMonth(req.query.month);
    res.json(data);
  } catch (error) {
    console.error("MISSION REPORT ERROR:", error);
    res.status(500).json({ message: "Erreur rapport missions" });
  }
};

const getCollaboratorReports = async (req, res) => {
  try {
    const data = await dashboardModel.getCollaboratorReportsForMonth(req.query.month);
    res.json(data);
  } catch (error) {
    console.error("COLLAB REPORT ERROR:", error);
    res.status(500).json({ message: "Erreur rapport collaborateurs" });
  }
};

module.exports = {
  getDashboard,
  getMissionReports,
  getCollaboratorReports,
};