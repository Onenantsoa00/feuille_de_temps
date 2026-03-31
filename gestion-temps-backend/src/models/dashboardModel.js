const pool = require("../config/db");

// total global
const getGlobalStats = async () => {
  const result = await pool.query(`
    SELECT COALESCE(
      SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600),
      0
    ) AS total_hours
    FROM work_hours
  `);

  return result.rows[0];
};

// total par utilisateur
const getUserStats = async () => {
  const result = await pool.query(`
    SELECT u.id,
           u.name,
           COALESCE(
             SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600),
             0
           ) AS total_hours
    FROM users u
    LEFT JOIN work_hours wh ON u.id = wh.user_id
    GROUP BY u.id
    ORDER BY total_hours DESC
  `);

  return result.rows;
};

// total par tâche
const getTaskStats = async () => {
  const result = await pool.query(`
    SELECT t.id,
           t.name,
           COALESCE(
             SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600),
             0
           ) AS total_hours
    FROM tasks t
    LEFT JOIN work_hours wh ON t.id = wh.task_id
    GROUP BY t.id
    ORDER BY total_hours DESC
  `);

  return result.rows;
};

// total par jour
const getDailyStats = async () => {
  const result = await pool.query(`
    SELECT work_date,
           COALESCE(
             SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600),
             0
           ) AS total_hours
    FROM work_hours
    GROUP BY work_date
    ORDER BY work_date DESC
  `);

  return result.rows;
};

const getEntityCounts = async () => {
  const missions = await pool.query(`SELECT COUNT(*)::int AS n FROM cases`);
  const societes = await pool.query(`SELECT COUNT(*)::int AS n FROM companies`);
  const employes = await pool.query(
    `SELECT COUNT(*)::int AS n FROM users WHERE role = 'employe'`
  );
  return {
    missions: missions.rows[0].n,
    societes: societes.rows[0].n,
    employes: employes.rows[0].n,
  };
};

/** Heures par jour, par société (via mission liée aux entrées) */
const getHoursByDayAndCompany = async () => {
  const result = await pool.query(`
    SELECT wh.work_date::text AS work_date,
           comp.id AS company_id,
           comp.name AS company_name,
           COALESCE(
             SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600),
             0
           ) AS hours
    FROM work_hours wh
    JOIN cases c ON wh.case_id = c.id
    JOIN companies comp ON c.company_id = comp.id
    GROUP BY wh.work_date, comp.id, comp.name
    ORDER BY wh.work_date ASC, comp.name
  `);
  return result.rows;
};

module.exports = {
  getGlobalStats,
  getUserStats,
  getTaskStats,
  getDailyStats,
  getEntityCounts,
  getHoursByDayAndCompany,
};