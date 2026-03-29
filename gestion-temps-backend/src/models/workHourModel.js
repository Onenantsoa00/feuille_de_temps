const pool = require("../config/db");

// créer un enregistrement
const createWorkHour = async (data) => {
  const { user_id, task_id, work_date, start_time, end_time } = data;

  const result = await pool.query(
    `INSERT INTO work_hours (user_id, task_id, work_date, start_time, end_time)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *,
     EXTRACT(EPOCH FROM (end_time - start_time))/3600 AS duration`,
    [user_id, task_id, work_date, start_time, end_time]
  );

  return result.rows[0];
};

// lister
const getAllWorkHours = async () => {
  const result = await pool.query(`
    SELECT wh.*,
           EXTRACT(EPOCH FROM (end_time - start_time))/3600 AS duration,
           u.name AS user_name,
           t.name AS task_name
    FROM work_hours wh
    JOIN users u ON wh.user_id = u.id
    JOIN tasks t ON wh.task_id = t.id
    ORDER BY wh.id DESC
  `);

  return result.rows;
};

module.exports = {
  createWorkHour,
  getAllWorkHours,
};