const pool = require("../config/db");

const caseSelect = `
    SELECT c.*,
           companies.name AS company_name,
           u.name AS chef_name,
           u.first_name AS chef_first_name
    FROM cases c
    LEFT JOIN companies ON c.company_id = companies.id
    LEFT JOIN users u ON c.user_id = u.id
`;

const getAllCases = async () => {
  const result = await pool.query(`${caseSelect} ORDER BY c.id DESC`);
  return result.rows;
};

const getCasesForRole = async (userId, role) => {
  if (role === "admin" || role === "secretaire") {
    return getAllCases();
  }
  if (role === "chef") {
    const result = await pool.query(
      `${caseSelect}
       WHERE c.user_id = $1
          OR c.id IN (SELECT case_id FROM case_assignments WHERE user_id = $1)
       ORDER BY c.id DESC`,
      [userId],
    );
    return result.rows;
  }
  const result = await pool.query(
    `${caseSelect}
     WHERE c.id IN (SELECT case_id FROM case_assignments WHERE user_id = $1)
     ORDER BY c.id DESC`,
    [userId],
  );
  return result.rows;
};

const createCase = async (payload) => {
  const {
    name,
    description = null,
    company_id,
    user_id, // 🔥 IMPORTANT
    start_date = null,
    end_date = null,
  } = payload;

  const result = await pool.query(
    `INSERT INTO cases
      (name, description, company_id, user_id, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, description, company_id, user_id, start_date, end_date],
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
  const c = await getCaseById(caseId);
  if (!c) return false;
  if (role === "admin" || role === "secretaire") return true;
  if (role === "chef" && c.user_id === userId) return true;
  if (role === "chef") {
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

module.exports = {
  getAllCases,
  getCasesForRole,
  createCase,
  getCaseById,
  replaceAssignments,
  getAssignmentUserIds,
  userCanAccessCase,
};
