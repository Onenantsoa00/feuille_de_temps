const pool = require("../config/db");
const caseModel = require("../models/caseModel");
const taskModel = require("../models/taskModel");

async function resolveTaskIdForSync(item, userId, userRole) {
  let tid =
    item.task_id != null && item.task_id !== "" ? Number(item.task_id) : null;
  const cid =
    item.case_id != null && item.case_id !== "" ? Number(item.case_id) : null;

  if (tid) return tid;
  if (!cid) return null;

  const ok = await caseModel.userCanAccessCase(cid, userId, userRole);
  if (!ok) {
    const err = new Error("Accès mission refusé (sync)");
    err.statusCode = 403;
    throw err;
  }

  const existing = await pool.query(
    `SELECT id FROM tasks WHERE case_id = $1 ORDER BY id ASC LIMIT 1`,
    [cid]
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const created = await taskModel.createTask({
    name: "Temps mission",
    description: null,
    work_location: null,
    case_id: cid,
  });
  return created.id;
}

const syncWorkHours = async (req, res) => {
  try {
    const { workHours } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    for (const item of workHours) {
      const taskId = await resolveTaskIdForSync(item, userId, userRole);
      if (!taskId) {
        return res.status(400).json({
          message: "Chaque entrée doit avoir une tâche ou une mission",
        });
      }
      await pool.query(
        `INSERT INTO work_hours (user_id, task_id, work_date, start_time, end_time)
        VALUES ($1, $2, $3, $4, $5)`,
        [
          item.user_id,
          taskId,
          item.work_date,
          item.start_time,
          item.end_time,
        ]
      );
    }

    res.json({
      message: "Synchronisation réussie",
      total: workHours.length,
    });
  } catch (error) {
    console.error("SYNC ERROR:", error);
    const code = error.statusCode || 500;
    res.status(code).json({
      message: error.message || "Erreur synchronisation",
    });
  }
};

module.exports = {
  syncWorkHours,
};
