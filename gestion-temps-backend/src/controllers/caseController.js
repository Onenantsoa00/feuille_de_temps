const caseModel = require("../models/caseModel");
const notificationModel = require("../models/notificationModel");
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
    const row = await caseModel.createCase(req.body);
    res.status(201).json(row);
  } catch (error) {
    console.error("CREATE CASE ERROR:", error);
    res.status(500).json({ message: "Erreur création mission" });
  }
};

const setAssignments = async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_ids: employeeIds = [] } = req.body;
    const { id: userId, role } = req.user;

    const mission = await caseModel.getCaseById(id);
    if (!mission)
      return res.status(404).json({ message: "Mission introuvable" });

    if (
      role !== "admin" &&
      role !== "secretaire" &&
      !(role === "chef_mission" && mission.user_id === userId)
    ) {
      return res.status(403).json({ message: "Accès refusé" });
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

module.exports = {
  getCases,
  createCase,
  setAssignments,
  getAssignments,
};
