const pool = require("../config/db");

const syncWorkHours = async (req, res) => {
  try {
    const { workHours } = req.body;

    for (const item of workHours) {
      await pool.query(
        `INSERT INTO work_hours 
        (user_id, task_id, case_id, work_date, start_time, end_time)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          item.user_id,
          item.task_id ?? null,
          item.case_id ?? null,
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
    res.status(500).json({
      message: "Erreur synchronisation",
    });
  }
};

module.exports = {
  syncWorkHours,
};