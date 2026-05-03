const workHourModel = require("../models/workHourModel");
const caseModel = require("../models/caseModel");
const pool = require("../config/db");
const normalizeRole = (role) => {
  if (role === "chef" || role === "chef_mission") return "chef_de_mission";
  if (role === "employe") return "collaborateur";
  return role;
};

const createWorkHour = async (req, res) => {
  try {
    const { task_id, work_date, start_time, end_time } = req.body;
    const caseIdBody =
      req.body.case_id != null && req.body.case_id !== ""
        ? Number(req.body.case_id)
        : null;

    if (!task_id && !caseIdBody) {
      return res.status(400).json({
        message: "Une tâche ou une mission est obligatoire",
      });
    }

    let taskCaseId = null;
    if (task_id) {
      const tq = await pool.query(`SELECT case_id FROM tasks WHERE id = $1`, [
        task_id,
      ]);
      taskCaseId = tq.rows[0]?.case_id ?? null;
    }

    if (caseIdBody != null && taskCaseId != null && caseIdBody !== taskCaseId) {
      return res.status(400).json({
        message: "La tâche ne correspond pas à la mission choisie",
      });
    }

    const caseIdForRow = caseIdBody ?? taskCaseId;

    if (caseIdForRow) {
      const ok = await caseModel.userCanAccessCase(
        caseIdForRow,
        req.user.id,
        req.user.role,
      );
      if (!ok) {
        return res.status(403).json({
          message: "Accès à cette mission refusé ou mission non validée",
        });
      }
    }

    const data = {
      user_id: req.user.id,
      task_id: task_id ?? null,
      case_id: caseIdForRow ?? null,
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
    const { id } = req.user;
    const role = normalizeRole(req.user.role);
    const result =
      role === "admin" || role === "expert_comptable" || role === "secretaire"
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

    await pool.query("DELETE FROM work_hours WHERE work_hour_id = $1", [id]);

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
