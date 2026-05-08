const caseModel = require("../models/caseModel");
const notificationModel = require("../models/notificationModel");
const pool = require("../config/db");
const CASE_STATUS = {
  PENDING: 0,
  VALIDATED: 1,
  FINISHED: 2,
};
const normalizeRole = (role) => {
  if (role === "chef" || role === "chef_mission") return "chef_de_mission";
  if (role === "employe") return "collaborateur";
  return role;
};
const getCases = async (req, res) => {
  try {
    const { id, role } = req.user;
    const cases = await caseModel.getCasesForRole(id, role);
    res.json(cases);
  } catch (error) {
    console.error("GET CASES ERROR:", error);
    res.status(500).json({ message: "Erreur récupération missions" });
  }
};

const createCase = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      created_by: req.user.id,
      status:
        req.user.role === "secretaire"
          ? CASE_STATUS.PENDING
          : CASE_STATUS.VALIDATED,
    };
    const row = await caseModel.createCase(payload);

    if (normalizeRole(req.user.role) === "secretaire") {
      const adminUsers = await pool.query(
        `SELECT id FROM users WHERE role = 'admin'`
      );
      const io = req.app.get("io");
      for (const admin of adminUsers.rows) {
        const notif = await notificationModel.create({
          user_id: admin.id,
          content: `Mission en attente de validation: ${row.name}`,
        });
        io.to(`user_${admin.id}`).emit("newNotification", notif);
        const unread = await notificationModel.countUnread(admin.id);
        io.to(`user_${admin.id}`).emit("notificationCount", unread);
      }
    }

    res.status(201).json(row);
  } catch (error) {
    console.error("CREATE CASE ERROR:", error);
    res.status(500).json({ message: "Erreur création mission" });
  }
};

const updateCase = async (req, res) => {
  try {
    const existing = await caseModel.getCaseById(Number(req.params.id));
    if (!existing) {
      return res.status(404).json({ message: "Mission introuvable" });
    }
    const row = await caseModel.updateCase(Number(req.params.id), req.body);
    res.json(row);
  } catch (error) {
    console.error("UPDATE CASE ERROR:", error);
    res.status(500).json({ message: "Erreur modification mission" });
  }
};

const setAssignments = async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_ids: employeeIds = [] } = req.body;
    const { id: userId } = req.user;
    const role = normalizeRole(req.user.role);

    const mission = await caseModel.getCaseById(id);
    if (!mission)
      return res.status(404).json({ message: "Mission introuvable" });

    if (
      role !== "admin" &&
      !(role === "chef_de_mission" && mission.user_id === userId)
    ) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    if (mission.status !== CASE_STATUS.VALIDATED) {
      return res
        .status(400)
        .json({ message: "Assignation possible uniquement après validation" });
    }

    await caseModel.replaceAssignments(
      id,
      Array.isArray(employeeIds) ? employeeIds.map(Number) : [],
    );

    const io = req.app.get("io");

    for (const employeeId of employeeIds) {
      const notif = await notificationModel.create({
        user_id: employeeId,
        content: `Nouvelle mission assignée : ${mission.name}`,
      });

      io.to(`user_${employeeId}`).emit("newNotification", notif);
    }

    const assigned = await caseModel.getAssignmentUserIds(id);
    res.json({ case_id: Number(id), employee_ids: assigned });
  } catch (error) {
    console.error("SET ASSIGNMENTS ERROR:", error);
    res.status(500).json({ message: "Erreur assignation" });
  }
};

const getAssignments = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;
    const ok = await caseModel.userCanAccessCase(Number(id), userId, role);
    if (!ok) return res.status(403).json({ message: "Accès refusé" });
    const employee_ids = await caseModel.getAssignmentUserIds(id);
    res.json({ case_id: Number(id), employee_ids });
  } catch (error) {
    console.error("GET ASSIGNMENTS ERROR:", error);
    res.status(500).json({ message: "Erreur" });
  }
};

const getPendingCases = async (_req, res) => {
  try {
    const rows = await caseModel.getPendingCases();
    res.json(rows);
  } catch (error) {
    console.error("GET PENDING CASES ERROR:", error);
    res.status(500).json({ message: "Erreur" });
  }
};

const validateCase = async (req, res) => {
  try {
    const row = await caseModel.validateCase(Number(req.params.id), req.user.id);
    if (!row) {
      const existing = await caseModel.getCaseById(Number(req.params.id));
      if (!existing) {
        return res.status(404).json({ message: "Mission introuvable" });
      }
      return res.json({ message: "Mission déjà validée", case: existing });
    }
    res.json({ message: "Mission validée", case: row });
  } catch (error) {
    console.error("VALIDATE CASE ERROR:", error);
    res.status(500).json({ message: "Erreur validation mission" });
  }
};

const finishCase = async (req, res) => {
  try {
    const row = await caseModel.finishCase(Number(req.params.id), req.user.id);
    if (!row) {
      const existing = await caseModel.getCaseById(Number(req.params.id));
      if (!existing) {
        return res.status(404).json({ message: "Mission introuvable" });
      }
      if (Number(existing.status) === CASE_STATUS.FINISHED) {
        return res.json({ message: "Mission déjà terminée", case: existing });
      }
      return res.status(400).json({
        message: "Mission non validée, impossible de la terminer",
      });
    }
    res.json({ message: "Mission marquée terminée", case: row });
  } catch (error) {
    console.error("FINISH CASE ERROR:", error);
    res.status(500).json({ message: "Erreur fin de mission" });
  }
};

module.exports = {
  getCases,
  createCase,
  updateCase,
  setAssignments,
  getAssignments,
  getPendingCases,
  validateCase,
  finishCase,
};
