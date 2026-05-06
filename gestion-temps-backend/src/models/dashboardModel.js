const pool = require("../config/db");

const normalizeRole = (role) => {
  if (role === "chef" || role === "chef_mission") return "chef_de_mission";
  if (role === "employe") return "collaborateur";
  return role;
};

const getEntityCounts = async () => {
  const missions = await pool.query(`SELECT COUNT(*)::int AS n FROM cases`);
  const societes = await pool.query(`SELECT COUNT(*)::int AS n FROM companies`);
  const collaborateurs = await pool.query(
    `SELECT COUNT(*)::int AS n FROM users WHERE role IN ('collaborateur', 'employe')`
  );
  return {
    missions: missions.rows[0].n,
    societes: societes.rows[0].n,
    collaborateurs: collaborateurs.rows[0].n,
  };
};

const getMissionSummaries = async ({ period }) => {
  const dateTruncExpr =
    period === "weekly"
      ? "DATE_TRUNC('week', wh.work_date)::date"
      : "DATE_TRUNC('month', wh.work_date)::date";

  const result = await pool.query(
    `SELECT
       ${dateTruncExpr}::text AS period_start,
       c.id AS mission_id,
       c.name AS mission_name,
       COALESCE(comp.name, '—') AS company_name,
       COUNT(DISTINCT wh.user_id)::int AS participants_count,
       COALESCE(SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600), 0) AS total_hours
     FROM work_hours wh
     LEFT JOIN tasks t ON t.id = wh.task_id
     LEFT JOIN cases c ON c.id = t.case_id
     LEFT JOIN companies comp ON comp.id = c.company_id
     GROUP BY ${dateTruncExpr}, c.id, c.name, comp.name
     ORDER BY period_start DESC, total_hours DESC, c.name ASC`
  );
  return result.rows;
};

/** Mois au format YYYY-MM (défaut : mois courant serveur) */
const normalizeMonthParam = (monthStr) => {
  if (monthStr && /^\d{4}-\d{2}$/.test(String(monthStr))) {
    return String(monthStr);
  }
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const getMissionReportsForMonth = async (monthStr) => {
  const month = normalizeMonthParam(monthStr);
  const monthStart = `${month}-01`;
  const params = [monthStart];

  const weekly = await pool.query(
    `SELECT
       DATE_TRUNC('week', wh.work_date)::date::text AS period_start,
       c.id AS mission_id,
       c.name AS mission_name,
       COALESCE(comp.name, '—') AS company_name,
       COUNT(DISTINCT wh.user_id)::int AS participants_count,
       COALESCE(SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600), 0) AS total_hours
     FROM work_hours wh
     LEFT JOIN tasks t ON t.id = wh.task_id
     LEFT JOIN cases c ON c.id = t.case_id
     LEFT JOIN companies comp ON comp.id = c.company_id
     WHERE wh.work_date >= $1::date
       AND wh.work_date < ($1::date + INTERVAL '1 month')
     GROUP BY DATE_TRUNC('week', wh.work_date), c.id, c.name, comp.name
     ORDER BY period_start ASC, total_hours DESC, c.name ASC`,
    params
  );

  const monthly = await pool.query(
    `SELECT
       $1::text AS period_start,
       c.id AS mission_id,
       c.name AS mission_name,
       COALESCE(comp.name, '—') AS company_name,
       COUNT(DISTINCT wh.user_id)::int AS participants_count,
       COALESCE(SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600), 0) AS total_hours
     FROM work_hours wh
     LEFT JOIN tasks t ON t.id = wh.task_id
     LEFT JOIN cases c ON c.id = t.case_id
     LEFT JOIN companies comp ON comp.id = c.company_id
     WHERE wh.work_date >= $1::date
       AND wh.work_date < ($1::date + INTERVAL '1 month')
     GROUP BY c.id, c.name, comp.name
     ORDER BY total_hours DESC, c.name ASC`,
    params
  );

  return { month, weekly: weekly.rows, monthly: monthly.rows };
};

const getCollaboratorReportsForMonth = async (monthStr) => {
  const month = normalizeMonthParam(monthStr);
  const monthStart = `${month}-01`;
  const params = [monthStart];

  const weekly = await pool.query(
    `SELECT
       DATE_TRUNC('week', wh.work_date)::date::text AS period_start,
       u.id AS user_id,
       COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.name)), ''), u.email) AS user_name,
       u.email AS user_email,
       u.role AS user_role,
       COALESCE(c.id, 0) AS mission_id,
       COALESCE(c.name, '(sans mission)') AS mission_name,
       COALESCE(comp.name, '—') AS company_name,
       COALESCE(SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600), 0) AS total_hours,
       COUNT(*)::int AS entries_count
     FROM work_hours wh
     JOIN users u ON u.id = wh.user_id
     LEFT JOIN tasks t ON t.id = wh.task_id
     LEFT JOIN cases c ON c.id = t.case_id
     LEFT JOIN companies comp ON comp.id = c.company_id
     WHERE wh.work_date >= $1::date
       AND wh.work_date < ($1::date + INTERVAL '1 month')
     GROUP BY DATE_TRUNC('week', wh.work_date), u.id, u.first_name, u.name, u.email, u.role, c.id, c.name, comp.name
     ORDER BY period_start ASC, user_name ASC, mission_name ASC`,
    params
  );

  const monthly = await pool.query(
    `SELECT
       $1::text AS period_start,
       u.id AS user_id,
       COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.name)), ''), u.email) AS user_name,
       u.email AS user_email,
       u.role AS user_role,
       COALESCE(c.id, 0) AS mission_id,
       COALESCE(c.name, '(sans mission)') AS mission_name,
       COALESCE(comp.name, '—') AS company_name,
       COALESCE(SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600), 0) AS total_hours,
       COUNT(*)::int AS entries_count
     FROM work_hours wh
     JOIN users u ON u.id = wh.user_id
     LEFT JOIN tasks t ON t.id = wh.task_id
     LEFT JOIN cases c ON c.id = t.case_id
     LEFT JOIN companies comp ON comp.id = c.company_id
     WHERE wh.work_date >= $1::date
       AND wh.work_date < ($1::date + INTERVAL '1 month')
     GROUP BY u.id, u.first_name, u.name, u.email, u.role, c.id, c.name, comp.name
     ORDER BY user_name ASC, mission_name ASC`,
    params
  );

  return { month, weekly: weekly.rows, monthly: monthly.rows };
};

const getTopMissions = async (limit = 10) => {
  const result = await pool.query(
    `SELECT c.id AS mission_id,
            c.name AS mission_name,
            COALESCE(comp.name, '—') AS company_name,
            COALESCE(SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600), 0) AS total_hours,
            COUNT(DISTINCT wh.user_id)::int AS participants_count
     FROM work_hours wh
     LEFT JOIN tasks t ON t.id = wh.task_id
     LEFT JOIN cases c ON c.id = t.case_id
     LEFT JOIN companies comp ON comp.id = c.company_id
     GROUP BY c.id, c.name, comp.name
     HAVING COALESCE(SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600), 0) > 0
     ORDER BY total_hours DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
};

const getTopCollaborateurs = async (limit = 10) => {
  const result = await pool.query(
    `SELECT u.id AS user_id,
            COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.name)), ''), u.email) AS user_name,
            u.email AS user_email,
            u.role AS user_role,
            COALESCE(SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600), 0) AS total_hours
     FROM users u
     JOIN work_hours wh ON wh.user_id = u.id
     WHERE u.role IN ('collaborateur', 'employe')
     GROUP BY u.id, u.first_name, u.name, u.email, u.role
     ORDER BY total_hours DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
};

const getMissionParticipationDetails = async () => {
  const result = await pool.query(
    `SELECT
       c.id AS mission_id,
       c.name AS mission_name,
       COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.name)), ''), u.email) AS user_name,
       u.role,
       COALESCE(SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600), 0) AS total_hours
     FROM work_hours wh
     LEFT JOIN tasks t ON t.id = wh.task_id
     LEFT JOIN cases c ON c.id = t.case_id
     JOIN users u ON u.id = wh.user_id
     GROUP BY c.id, c.name, user_name, u.role
     ORDER BY c.name ASC, total_hours DESC`
  );
  return result.rows;
};

const getAdminTaskTraces = async () => {
  const result = await pool.query(
    `SELECT wh.work_date::text AS work_date,
            COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.name)), ''), u.email) AS user_name,
            u.role AS user_role,
            u.email AS user_email,
            COALESCE(t.name, '(sans tâche)') AS task_name,
            COALESCE(c.name, '(sans mission)') AS mission_name,
            COALESCE(NULLIF(TRIM(CONCAT(ch.first_name, ' ', ch.name)), ''), ch.email, '(sans chef)') AS chef_name,
            COALESCE(comp.name, '(sans société)') AS company_name,
            ROUND(COALESCE(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600, 0)::numeric, 2) AS duration_hours
     FROM work_hours wh
     JOIN users u ON u.id = wh.user_id
     LEFT JOIN tasks t ON t.id = wh.task_id
     LEFT JOIN cases c ON c.id = COALESCE(
       t.case_id,
       (SELECT ca.case_id
        FROM case_assignments ca
        WHERE ca.user_id = wh.user_id
          AND t.case_id IS NULL
        ORDER BY ca.case_id
        LIMIT 1)
     )
     LEFT JOIN companies comp ON comp.id = c.company_id
     LEFT JOIN users ch ON ch.id = c.user_id
     ORDER BY wh.work_date DESC, wh.work_hour_id DESC
     LIMIT 200`
  );
  return result.rows;
};

const getMissionDeadlines = async () => {
  const result = await pool.query(
    `SELECT c.id AS mission_id,
            c.name AS mission_name,
            COALESCE(comp.name, '—') AS company_name,
            c.end_date::text AS end_date,
            c.status
     FROM cases c
     LEFT JOIN companies comp ON comp.id = c.company_id
     WHERE c.end_date IS NOT NULL
     ORDER BY c.end_date ASC`
  );
  return result.rows;
};

const getScopedTaskTraces = async ({ userId, role }) => {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "secretaire") {
    return getAdminTaskTraces();
  }
  if (normalizedRole === "chef_de_mission") {
    const result = await pool.query(
      `SELECT wh.work_date::text AS work_date,
              COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.name)), ''), u.email) AS user_name,
              u.role AS user_role,
              u.email AS user_email,
              COALESCE(t.name, '(sans tâche)') AS task_name,
              COALESCE(c.name, '(sans mission)') AS mission_name,
              COALESCE(NULLIF(TRIM(CONCAT(ch.first_name, ' ', ch.name)), ''), ch.email, '(sans chef)') AS chef_name,
              COALESCE(comp.name, '(sans société)') AS company_name,
              ROUND(COALESCE(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600, 0)::numeric, 2) AS duration_hours
       FROM work_hours wh
       JOIN users u ON u.id = wh.user_id
       LEFT JOIN tasks t ON t.id = wh.task_id
       LEFT JOIN cases c ON c.id = t.case_id
       LEFT JOIN companies comp ON comp.id = c.company_id
       LEFT JOIN users ch ON ch.id = c.user_id
       WHERE c.user_id = $1
          OR c.id IN (SELECT case_id FROM case_assignments WHERE user_id = $1)
       ORDER BY wh.work_date DESC, wh.work_hour_id DESC
       LIMIT 200`,
      [userId]
    );
    return result.rows;
  }
  if (normalizedRole === "collaborateur") {
    const result = await pool.query(
      `SELECT wh.work_date::text AS work_date,
              COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.name)), ''), u.email) AS user_name,
              u.role AS user_role,
              u.email AS user_email,
              COALESCE(t.name, '(sans tâche)') AS task_name,
              COALESCE(c.name, '(sans mission)') AS mission_name,
              COALESCE(NULLIF(TRIM(CONCAT(ch.first_name, ' ', ch.name)), ''), ch.email, '(sans chef)') AS chef_name,
              COALESCE(comp.name, '(sans société)') AS company_name,
              ROUND(COALESCE(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600, 0)::numeric, 2) AS duration_hours
       FROM work_hours wh
       JOIN users u ON u.id = wh.user_id
       LEFT JOIN tasks t ON t.id = wh.task_id
       LEFT JOIN cases c ON c.id = t.case_id
       LEFT JOIN companies comp ON comp.id = c.company_id
       LEFT JOIN users ch ON ch.id = c.user_id
       WHERE wh.user_id = $1
       ORDER BY wh.work_date DESC, wh.work_hour_id DESC
       LIMIT 200`,
      [userId]
    );
    return result.rows;
  }
  return [];
};

const getCollaborateurStats = async ({ userId }) => {
  const [taskStats, missionStats, monthly, global] = await Promise.all([
    pool.query(
      `SELECT COALESCE(t.name, '(sans tâche)') AS task_name,
              COALESCE(SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600), 0) AS total_hours
       FROM work_hours wh
       LEFT JOIN tasks t ON t.id = wh.task_id
       WHERE wh.user_id = $1
       GROUP BY task_name
       ORDER BY total_hours DESC
       LIMIT 8`,
      [userId]
    ),
    pool.query(
      `SELECT c.id AS mission_id,
              c.name AS mission_name,
              COALESCE(comp.name, '—') AS company_name,
              COALESCE(SUM(EXTRACT(EPOCH FROM (wh.end_time - wh.start_time))/3600), 0) AS total_hours
       FROM work_hours wh
       LEFT JOIN tasks t ON t.id = wh.task_id
       LEFT JOIN cases c ON c.id = t.case_id
       LEFT JOIN companies comp ON comp.id = c.company_id
       WHERE wh.user_id = $1
       GROUP BY c.id, c.name, comp.name
       ORDER BY total_hours DESC
       LIMIT 8`,
      [userId]
    ),
    pool.query(
      `SELECT DATE_TRUNC('month', work_date)::date::text AS month_start,
              COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600), 0) AS total_hours
       FROM work_hours
       WHERE user_id = $1
       GROUP BY month_start
       ORDER BY month_start DESC
       LIMIT 12`,
      [userId]
    ),
    pool.query(
      `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600), 0) AS total_hours
       FROM work_hours
       WHERE user_id = $1`,
      [userId]
    ),
  ]);

  return {
    totalHours: Number(global.rows[0].total_hours || 0),
    topTasks: taskStats.rows,
    missionContributions: missionStats.rows,
    monthlyHours: monthly.rows.reverse(),
  };
};

const getRoleDashboard = async ({ userId, role }) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin" || normalizedRole === "expert_comptable") {
    const [
      counts,
      taskTraces,
      weeklyMissionSummaries,
      monthlyMissionSummaries,
      missionParticipation,
      topMissions,
      topCollaborateurs,
      missionDeadlines,
    ] = await Promise.all([
      getEntityCounts(),
      getAdminTaskTraces(),
      getMissionSummaries({ period: "weekly" }),
      getMissionSummaries({ period: "monthly" }),
      getMissionParticipationDetails(),
      getTopMissions(10),
      getTopCollaborateurs(10),
      getMissionDeadlines(),
    ]);

    const totalHours = taskTraces.reduce(
      (acc, row) => acc + Number(row.duration_hours || 0),
      0
    );

    return {
      role: normalizedRole,
      cards: [
        { key: "missions", label: "Missions", value: counts.missions },
        { key: "collaborateurs", label: "Collaborateurs", value: counts.collaborateurs },
        { key: "societes", label: "Sociétés", value: counts.societes },
        { key: "heures", label: "Heures totales", value: totalHours },
      ],
      taskTraces: taskTraces.slice(0, 120),
      missionSeries: [],
      hoursSeries: [],
      topUsers: [],
      topTasks: [],
      topMissions,
      topCollaborateurs,
      missionDeadlines,
      printMode: {
        available: true,
        reportLinks: true,
        sections: ["traces", "weeklyMissionSummaries", "monthlyMissionSummaries"],
      },
      weeklyMissionSummaries,
      monthlyMissionSummaries,
      missionParticipation,
      collaboratorStats: null,
    };
  }

  if (normalizedRole === "collaborateur") {
    const [collaboratorStats, taskTraces] = await Promise.all([
      getCollaborateurStats({ userId }),
      getScopedTaskTraces({ userId, role: normalizedRole }),
    ]);
    return {
      role: normalizedRole,
      cards: [
        { key: "total", label: "Heures totales", value: collaboratorStats.totalHours },
        {
          key: "missions",
          label: "Missions contribuees",
          value: collaboratorStats.missionContributions.length,
        },
        { key: "tasks", label: "Taches actives", value: collaboratorStats.topTasks.length },
      ],
      taskTraces,
      missionSeries: [],
      hoursSeries: collaboratorStats.monthlyHours.map((r) => ({
        work_date: r.month_start,
        hours: r.total_hours,
      })),
      topUsers: [],
      topTasks: collaboratorStats.topTasks,
      printMode: {
        available: true,
        sections: ["topTasks", "missionContributions", "monthlyHours"],
      },
      weeklyMissionSummaries: [],
      monthlyMissionSummaries: [],
      missionParticipation: [],
      collaboratorStats,
      missionDeadlines: [],
    };
  }

  if (normalizedRole === "secretaire" || normalizedRole === "chef_de_mission") {
    const taskTraces = await getScopedTaskTraces({ userId, role: normalizedRole });
    const totalHours = taskTraces.reduce(
      (acc, row) => acc + Number(row.duration_hours || 0),
      0
    );
    return {
      role: normalizedRole,
      cards: [
        { key: "heures", label: "Heures totales", value: totalHours },
        { key: "traces", label: "Saisies", value: taskTraces.length },
      ],
      taskTraces: taskTraces.slice(0, 120),
      missionSeries: [],
      hoursSeries: [],
      topUsers: [],
      topTasks: [],
      topMissions: [],
      topCollaborateurs: [],
      printMode: { available: true, sections: ["traces"] },
      weeklyMissionSummaries: [],
      monthlyMissionSummaries: [],
      missionParticipation: [],
      collaboratorStats: null,
      missionDeadlines: [],
    };
  }

  return {
    role: normalizedRole,
    cards: [],
    taskTraces: [],
    missionSeries: [],
    hoursSeries: [],
    topUsers: [],
    topTasks: [],
    printMode: { available: false, sections: [] },
    weeklyMissionSummaries: [],
    monthlyMissionSummaries: [],
    missionParticipation: [],
    collaboratorStats: null,
    missionDeadlines: [],
  };
};

module.exports = {
  getRoleDashboard,
  getMissionReportsForMonth,
  getCollaboratorReportsForMonth,
};

