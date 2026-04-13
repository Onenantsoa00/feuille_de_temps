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
    SELECT 
      wh.work_date::text AS work_date,
      comp.id AS company_id,
      comp.name AS company_name,
      COALESCE(
        SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600),
        0
      ) AS hours
    FROM work_hours wh
    JOIN tasks t ON wh.task_id = t.id
    JOIN cases c ON t.case_id = c.id
    JOIN companies comp ON c.company_id = comp.id
    GROUP BY wh.work_date, comp.id, comp.name
    ORDER BY wh.work_date ASC, comp.name
  `);
  return result.rows;
};

const normalizeRole = (role) => (role === "chef_mission" ? "chef" : role);

const getRoleDashboard = async ({ userId, role }) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin") {
    const [global, counts, topUsers, topTasks, hoursSeries, taskTraces, missionSeries] =
      await Promise.all([
      getGlobalStats(),
      getEntityCounts(),
      getUserStats(),
      getTaskStats(),
      (async () => {
        const result = await pool.query(`
          SELECT wh.work_date::text AS work_date,
                 COALESCE(SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600), 0) AS hours
          FROM work_hours wh
          GROUP BY wh.work_date
          ORDER BY wh.work_date ASC
        `);
        return result.rows;
      })(),
      (async () => {
        const result = await pool.query(`
          SELECT wh.work_date::text AS work_date,
                 COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.name)), ''), u.email) AS user_name,
                 COALESCE(t.name, '(sans tâche)') AS task_name,
                 COALESCE(c.name, '(sans mission)') AS mission_name,
                 COALESCE(comp.name, '(sans société)') AS company_name,
                 ROUND(COALESCE(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600, 0)::numeric, 2) AS duration_hours
          FROM work_hours wh
          JOIN users u ON u.id = wh.user_id
          LEFT JOIN tasks t ON t.id = wh.task_id
          LEFT JOIN cases c ON c.id = t.case_id
          LEFT JOIN companies comp ON comp.id = c.company_id
          ORDER BY wh.work_date DESC, wh.work_hour_id DESC
          LIMIT 120
        `);
        return result.rows;
      })(),
      (async () => {
        const result = await pool.query(`
          SELECT wh.work_date::text AS work_date,
                 c.id AS mission_id,
                 c.name AS mission_name,
                 COALESCE(SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600), 0) AS hours
          FROM work_hours wh
          LEFT JOIN tasks t ON t.id = wh.task_id
          JOIN cases c ON c.id = t.case_id
          GROUP BY wh.work_date, c.id, c.name
          ORDER BY wh.work_date ASC, c.name ASC
        `);
        return result.rows;
      })(),
    ]);

    return {
      role: normalizedRole,
      cards: [
        { key: "missions", label: "Missions", value: counts.missions },
        { key: "employes", label: "Employés", value: counts.employes },
        { key: "societes", label: "Sociétés", value: counts.societes },
        { key: "heures", label: "Heures totales", value: Number(global.total_hours || 0) },
      ],
      hoursSeries,
      missionSeries,
      taskTraces: taskTraces.slice(0, 60),
      topUsers: topUsers.slice(0, 8),
      topTasks: topTasks.slice(0, 8),
      highlights: [],
    };
  }

  if (normalizedRole === "chef") {
    const [missionsCount, employeesCount, totalHours, hoursSeries, topEmployees] =
      await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS n FROM cases WHERE user_id = $1`, [userId]),
        pool.query(
          `SELECT COUNT(DISTINCT ca.user_id)::int AS n
           FROM case_assignments ca
           JOIN cases c ON c.id = ca.case_id
           WHERE c.user_id = $1`,
          [userId]
        ),
        pool.query(
          `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600), 0) AS total_hours
           FROM work_hours wh
           LEFT JOIN tasks t ON t.id = wh.task_id
           LEFT JOIN cases c ON c.id = t.case_id
           WHERE c.user_id = $1`,
          [userId]
        ),
        pool.query(
          `SELECT wh.work_date::text AS work_date,
                  COALESCE(SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600), 0) AS hours
           FROM work_hours wh
           LEFT JOIN tasks t ON t.id = wh.task_id
           LEFT JOIN cases c ON c.id = t.case_id
           WHERE c.user_id = $1
           GROUP BY wh.work_date
           ORDER BY wh.work_date ASC`,
          [userId]
        ),
        pool.query(
          `SELECT u.id,
                  COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.name)), ''), u.email) AS name,
                  COALESCE(SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600), 0) AS total_hours
           FROM users u
           JOIN case_assignments ca ON ca.user_id = u.id
           JOIN cases c ON c.id = ca.case_id
           LEFT JOIN work_hours wh ON wh.user_id = u.id
           LEFT JOIN tasks t ON t.id = wh.task_id
           LEFT JOIN cases c2 ON c2.id = t.case_id
           WHERE c.user_id = $1
             AND (c2.id IS NULL OR c2.user_id = $1)
           GROUP BY u.id
           ORDER BY total_hours DESC`,
          [userId]
        ),
      ]);

    return {
      role: normalizedRole,
      cards: [
        { key: "missions", label: "Mes missions", value: missionsCount.rows[0].n },
        { key: "employes", label: "Employés assignés", value: employeesCount.rows[0].n },
        { key: "heures", label: "Heures sur mes missions", value: Number(totalHours.rows[0].total_hours || 0) },
      ],
      hoursSeries: hoursSeries.rows,
    missionSeries: [],
    taskTraces: [],
      topUsers: topEmployees.rows.slice(0, 8),
      topTasks: [],
      highlights: [],
    };
  }

  if (normalizedRole === "secretaire") {
    const [createdMissions, pendingValidations, validatedMissions, companiesCount, hoursSeries] =
      await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS n FROM cases WHERE created_by = $1`, [userId]),
        pool.query(
          `SELECT COUNT(*)::int AS n
           FROM cases
           WHERE created_by = $1
             AND status = 0`,
          [userId]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS n
           FROM cases
           WHERE created_by = $1
             AND status = 1`,
          [userId]
        ),
        pool.query(`SELECT COUNT(*)::int AS n FROM companies`),
        pool.query(
          `SELECT wh.work_date::text AS work_date,
                  COALESCE(SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600), 0) AS hours
           FROM work_hours wh
           LEFT JOIN tasks t ON t.id = wh.task_id
           LEFT JOIN cases c ON c.id = t.case_id
           WHERE c.created_by = $1
           GROUP BY wh.work_date
           ORDER BY wh.work_date ASC`,
          [userId]
        ),
      ]);

    return {
      role: normalizedRole,
      cards: [
        { key: "created", label: "Missions créées", value: createdMissions.rows[0].n },
        { key: "pending", label: "En attente validation", value: pendingValidations.rows[0].n },
        { key: "validated", label: "Missions validées", value: validatedMissions.rows[0].n },
        { key: "societes", label: "Sociétés", value: companiesCount.rows[0].n },
      ],
      hoursSeries: hoursSeries.rows,
      missionSeries: [],
      taskTraces: [],
      topUsers: [],
      topTasks: [],
      highlights: [],
    };
  }

  // Employé (et fallback)
  const [totalHours, weekHours, assignedMissions, hoursSeries] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600), 0) AS total_hours
       FROM work_hours
       WHERE user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600), 0) AS total_hours
       FROM work_hours
       WHERE user_id = $1
         AND work_date >= (CURRENT_DATE - INTERVAL '6 days')`,
      [userId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS n
       FROM case_assignments
       WHERE user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT work_date::text AS work_date,
              COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600), 0) AS hours
       FROM work_hours
       WHERE user_id = $1
       GROUP BY work_date
       ORDER BY work_date ASC`,
      [userId]
    ),
  ]);

  return {
    role: normalizedRole,
    cards: [
      { key: "assigned", label: "Missions assignées", value: assignedMissions.rows[0].n },
      { key: "week", label: "Heures (7 jours)", value: Number(weekHours.rows[0].total_hours || 0) },
      { key: "total", label: "Heures totales", value: Number(totalHours.rows[0].total_hours || 0) },
    ],
    hoursSeries: hoursSeries.rows,
    missionSeries: [],
    taskTraces: [],
    topUsers: [],
    topTasks: [],
    highlights: [],
  };
};

module.exports = {
  getGlobalStats,
  getUserStats,
  getTaskStats,
  getDailyStats,
  getEntityCounts,
  getHoursByDayAndCompany,
  getRoleDashboard,
};
