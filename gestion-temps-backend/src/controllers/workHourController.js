const workHourModel = require("../models/workHourModel");

// create
const createWorkHour = async (req, res) => {
  try {
    const data = {
      ...req.body,
      user_id: req.user.id, // vient du JWT
    };

    const result = await workHourModel.createWorkHour(data);

    res.status(201).json(result);
  } catch (error) {
    console.error("WORK HOUR ERROR:", error);
    res.status(500).json({
      message: "Erreur création feuille de temps",
    });
  }
};

// get all
const getWorkHours = async (req, res) => {
  try {
    const result = await workHourModel.getAllWorkHours();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: "Erreur récupération heures",
    });
  }
};

module.exports = {
  createWorkHour,
  getWorkHours,
};