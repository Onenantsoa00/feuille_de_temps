const pool = require("../config/db");

const createWorkHour = async (data) => {
  const { user_id, task_id, work_date, start_time, end_time } = data;

  const result = await pool.query(
    `INSERT INTO work_hours (user_id, task_id, work_date, start_time, end_time)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *,
     COALESCE(EXTRACT(EPOCH FROM (end_time - start_time))/3600, 0) AS duration`,
    [user_id, task_id ?? null, work_date, start_time, end_time],
  );

  return result.rows[0];
};

const getAllWorkHours = async () => {
  const result = await pool.query(`
    SELECT 
  wh.work_hour_id AS id,
  wh.user_id,
  wh.task_id,
  wh.work_date,
  wh.start_time,
  wh.end_time,
           COALESCE(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600, 0) AS duration,
           u.name AS user_name,
           t.name AS task_name,
           c.name AS case_name,
           comp.name AS company_name
    FROM work_hours wh
    JOIN users u ON wh.user_id = u.id
    LEFT JOIN tasks t ON wh.task_id = t.id
    LEFT JOIN cases c ON t.case_id = c.id
    LEFT JOIN companies comp ON c.company_id = comp.id
    ORDER BY wh.work_hour_id DESC
  `);

  return result.rows;
};

const getWorkHoursForUser = async (userId) => {
  const result = await pool.query(
    `
    SELECT 
  wh.work_hour_id AS id,
  wh.user_id,
  wh.task_id,
  wh.work_date,
  wh.start_time,
  wh.end_time,
           COALESCE(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600, 0) AS duration,
           u.name AS user_name,
           t.name AS task_name,
           c.name AS case_name,
           comp.name AS company_name
    FROM work_hours wh
    JOIN users u ON wh.user_id = u.id
    LEFT JOIN tasks t ON wh.task_id = t.id
    LEFT JOIN cases c ON t.case_id = c.id
    LEFT JOIN companies comp ON c.company_id = comp.id
    WHERE wh.user_id = $1
    ORDER BY wh.work_hour_id DESC
  `,
    [userId],
  );

  return result.rows;
};

module.exports = {
  createWorkHour,
  getAllWorkHours,
  getWorkHoursForUser,
};
