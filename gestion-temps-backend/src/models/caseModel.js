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

const caseSelect = `
    SELECT c.*,
           companies.name AS company_name,
           u.name AS chef_name,
           u.first_name AS chef_first_name,
           COALESCE((
             SELECT json_agg(
               json_build_object(
                 'id', assignee.id,
                 'name', assignee.name,
                 'first_name', assignee.first_name,
                 'email', assignee.email,
                 'role', assignee.role
               )
               ORDER BY assignee.first_name NULLS LAST, assignee.name NULLS LAST, assignee.email
             )
             FROM case_assignments ca
             JOIN users assignee ON assignee.id = ca.user_id
             WHERE ca.case_id = c.id
           ), '[]'::json) AS assigned_collaborators
    FROM cases c
    LEFT JOIN companies ON c.company_id = companies.id
    LEFT JOIN users u ON c.user_id = u.id
`;

const getAllCases = async () => {
  const result = await pool.query(`${caseSelect} ORDER BY c.id DESC`);
  return result.rows;
};

const getCasesForRole = async (userId, role) => {
  const normalizedRole = normalizeRole(role);
  if (
    normalizedRole === "admin" ||
    normalizedRole === "expert_comptable" ||
    normalizedRole === "secretaire"
  ) {
    return getAllCases();
  }
  if (normalizedRole === "chef_de_mission") {
    const result = await pool.query(
      `${caseSelect}
       WHERE c.status = $2
         AND (
           c.user_id = $1
           OR c.id IN (SELECT case_id FROM case_assignments WHERE user_id = $1)
         )
       ORDER BY c.id DESC`,
      [userId, CASE_STATUS.VALIDATED],
    );
    return result.rows;
  }
  const result = await pool.query(
    `${caseSelect}
     WHERE c.status = $2
       AND c.id IN (SELECT case_id FROM case_assignments WHERE user_id = $1)
     ORDER BY c.id DESC`,
    [userId, CASE_STATUS.VALIDATED],
  );
  return result.rows;
};

const createCase = async (payload) => {
  const {
    name,
    description = null,
    company_id,
    chef_id,
    start_date = null,
    end_date = null,
    created_by = null,
    status = CASE_STATUS.VALIDATED,
  } = payload;

  const result = await pool.query(
    `INSERT INTO cases
    (name, description, company_id, user_id, start_date, end_date, created_by, status)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
   RETURNING *`,
    [
      name,
      description,
      company_id,
      chef_id,
      start_date,
      end_date,
      created_by,
      status,
    ],
  );

  return result.rows[0];
};

const getCaseById = async (id) => {
  const result = await pool.query(`${caseSelect} WHERE c.id = $1`, [id]);
  return result.rows[0] || null;
};

const replaceAssignments = async (caseId, userIds) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM case_assignments WHERE case_id = $1", [
      caseId,
    ]);
    for (const uid of userIds) {
      await client.query(
        `INSERT INTO case_assignments (case_id, user_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [caseId, uid],
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

const getAssignmentUserIds = async (caseId) => {
  const result = await pool.query(
    `SELECT user_id FROM case_assignments WHERE case_id = $1`,
    [caseId],
  );
  return result.rows.map((r) => r.user_id);
};

const userCanAccessCase = async (caseId, userId, role) => {
  const normalizedRole = normalizeRole(role);
  const c = await getCaseById(caseId);
  if (!c) return false;
  if (Number(c.status) === CASE_STATUS.FINISHED) return false;
  const mustBeValidated =
    normalizedRole === "chef_de_mission" || normalizedRole === "collaborateur";
  if (mustBeValidated && c.status !== CASE_STATUS.VALIDATED) {
    return false;
  }
  if (
    normalizedRole === "admin" ||
    normalizedRole === "expert_comptable" ||
    normalizedRole === "secretaire"
  ) {
    return true;
  }
  if (normalizedRole === "chef_de_mission" && c.user_id === userId) return true;
  if (normalizedRole === "chef_de_mission") {
    const a = await pool.query(
      `SELECT 1 FROM case_assignments WHERE case_id = $1 AND user_id = $2`,
      [caseId, userId],
    );
    if (a.rows.length > 0) return true;
  }
  const r = await pool.query(
    `SELECT 1 FROM case_assignments WHERE case_id = $1 AND user_id = $2`,
    [caseId, userId],
  );
  return r.rows.length > 0;
};

const getPendingCases = async () => {
  const result = await pool.query(
    `${caseSelect}
     WHERE COALESCE(c.status, $2) = $1
     ORDER BY c.id DESC`
    ,
    [CASE_STATUS.PENDING, CASE_STATUS.VALIDATED]
  );
  return result.rows;
};

const validateCase = async (id, adminId) => {
  const result = await pool.query(
    `UPDATE cases
     SET status = $2,
         validated_by = $3,
         validated_at = NOW()
     WHERE id = $1
       AND COALESCE(status, $2) = $4
     RETURNING *`,
    [id, CASE_STATUS.VALIDATED, adminId, CASE_STATUS.PENDING]
  );
  return result.rows[0] || null;
};

const finishCase = async (id, adminId) => {
  const result = await pool.query(
    `UPDATE cases
     SET status = $2,
         validated_by = COALESCE(validated_by, $3),
         validated_at = COALESCE(validated_at, NOW())
     WHERE id = $1
       AND status = $4
     RETURNING *`,
    [id, CASE_STATUS.FINISHED, adminId, CASE_STATUS.VALIDATED]
  );
  return result.rows[0] || null;
};

module.exports = {
  getAllCases,
  getCasesForRole,
  createCase,
  getCaseById,
  replaceAssignments,
  getAssignmentUserIds,
  userCanAccessCase,
  getPendingCases,
  validateCase,
  finishCase,
  CASE_STATUS,
};
