const workHourModel = require("../models/workHourModel");
const caseModel = require("../models/caseModel");
const pool = require("../config/db");

const createWorkHour = async (req, res) => {
  try {
    const { task_id, case_id, work_date, start_time, end_time } = req.body;

    if (!task_id && !case_id) {
      return res.status(400).json({
        message: "Indiquez une tâche ou une mission",
      });
    }

    if (case_id) {
      const ok = await caseModel.userCanAccessCase(
        Number(case_id),
        req.user.id,
        req.user.role
      );
      if (!ok) {
        return res.status(403).json({ message: "Mission non autorisée" });
      }
    }

    const data = {
      user_id: req.user.id,
      task_id: task_id ?? null,
      case_id: case_id ?? null,
      work_date,
      start_time,
      end_time,
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

const getWorkHours = async (req, res) => {
  try {
    const { id, role } = req.user;
    const result =
      role === "admin" || role === "secretaire"
        ? await workHourModel.getAllWorkHours()
        : await workHourModel.getWorkHoursForUser(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: "Erreur récupération heures",
    });
  }
};

const deleteWorkHour = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM work_hours WHERE id = $1", [id]);

    res.json({ message: "Supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression" });
  }
};

module.exports = {
  createWorkHour,
  getWorkHours,
  deleteWorkHour,
};