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
                 'id', manager.id,
                 'name', manager.name,
                 'first_name', manager.first_name,
                 'email', manager.email,
                 'role', manager.role
               )
               ORDER BY manager.first_name NULLS LAST, manager.name NULLS LAST, manager.email
             )
             FROM case_assignments ca
             JOIN users manager ON manager.id = ca.user_id
             WHERE ca.case_id = c.id
               AND (ca.assignment_type = 'chef' OR ca.assignment_type IS NULL)
               AND manager.role IN ('chef', 'chef_mission', 'chef_de_mission')
           ), '[]'::json) AS assigned_chefs,
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
               AND (ca.assignment_type = 'collaborateur' OR ca.assignment_type IS NULL)
               AND assignee.role IN ('employe', 'collaborateur', 'chef_de_mission')
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
    chef_ids = [],
    collaborator_ids = [],
    start_date = null,
    end_date = null,
    created_by = null,
    status = CASE_STATUS.VALIDATED,
  } = payload;

  const primaryChefId = Number(chef_id ?? chef_ids?.[0] ?? null);
  const managerIds = [
    ...new Set(
      (Array.isArray(chef_ids) ? chef_ids : [chef_id])
        .filter(Boolean)
        .map(Number),
    ),
  ];
  const collaboratorIds = [
    ...new Set(
      (Array.isArray(collaborator_ids) ? collaborator_ids : [])
        .filter(Boolean)
        .map(Number),
    ),
  ];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO cases
      (name, description, company_id, user_id, start_date, end_date, created_by, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
      [
        name,
        description,
        company_id,
        primaryChefId,
        start_date,
        end_date,
        created_by,
        status,
      ],
    );
    const createdCase = result.rows[0];
    const secondaryManagers = managerIds.filter((id) => id !== primaryChefId);
    for (const managerId of secondaryManagers) {
      await client.query(
        `INSERT INTO case_assignments (case_id, user_id, assignment_type) VALUES ($1, $2, 'chef')
         ON CONFLICT DO NOTHING`,
        [createdCase.id, managerId],
      );
    }
    for (const collaboratorId of collaboratorIds) {
      await client.query(
        `INSERT INTO case_assignments (case_id, user_id, assignment_type) VALUES ($1, $2, 'collaborateur')
         ON CONFLICT DO NOTHING`,
        [createdCase.id, collaboratorId],
      );
    }
    await client.query("COMMIT");
    return createdCase;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const updateCase = async (id, payload) => {
  const {
    name,
    description = null,
    company_id,
    chef_id,
    chef_ids = [],
    collaborator_ids = [],
    start_date = null,
    end_date = null,
  } = payload;
  const primaryChefId = Number(chef_id ?? chef_ids?.[0] ?? null);
  const managerIds = [
    ...new Set(
      (Array.isArray(chef_ids) ? chef_ids : [chef_id])
        .filter(Boolean)
        .map(Number),
    ),
  ];
  const collaboratorIds = [
    ...new Set(
      (Array.isArray(collaborator_ids) ? collaborator_ids : [])
        .filter(Boolean)
        .map(Number),
    ),
  ];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE cases
       SET name = $2,
           description = $3,
           company_id = $4,
           user_id = $5,
           start_date = $6,
           end_date = $7
       WHERE id = $1
       RETURNING *`,
      [id, name, description, company_id, primaryChefId, start_date, end_date],
    );
    const updated = result.rows[0] || null;
    if (!updated) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `DELETE FROM case_assignments ca
       USING users u
       WHERE ca.case_id = $1
         AND ca.user_id = u.id
         AND u.role IN ('chef', 'chef_mission', 'chef_de_mission')`,
      [id],
    );

    await client.query(
      `DELETE FROM case_assignments
       WHERE case_id = $1
         AND assignment_type = 'collaborateur'`,
      [id],
    );

    const secondaryManagers = managerIds.filter(
      (managerId) => managerId !== primaryChefId,
    );
    for (const managerId of secondaryManagers) {
      await client.query(
        `INSERT INTO case_assignments (case_id, user_id, assignment_type) VALUES ($1, $2, 'chef')
         ON CONFLICT DO NOTHING`,
        [id, managerId],
      );
    }
    for (const collaboratorId of collaboratorIds) {
      await client.query(
        `INSERT INTO case_assignments (case_id, user_id, assignment_type) VALUES ($1, $2, 'collaborateur')
         ON CONFLICT DO NOTHING`,
        [id, collaboratorId],
      );
    }

    await client.query("COMMIT");
    return updated;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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
        `INSERT INTO case_assignments (case_id, user_id, assignment_type) VALUES ($1, $2, 'collaborateur')
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
     ORDER BY c.id DESC`,
    [CASE_STATUS.PENDING, CASE_STATUS.VALIDATED],
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
    [id, CASE_STATUS.VALIDATED, adminId, CASE_STATUS.PENDING],
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
    [id, CASE_STATUS.FINISHED, adminId, CASE_STATUS.VALIDATED],
  );
  return result.rows[0] || null;
};

module.exports = {
  getAllCases,
  getCasesForRole,
  createCase,
  updateCase,
  getCaseById,
  replaceAssignments,
  getAssignmentUserIds,
  userCanAccessCase,
  getPendingCases,
  validateCase,
  finishCase,
  CASE_STATUS,
};
