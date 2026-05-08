const pool = require("../config/db");

let hasCompanyColumnCache = null;
const BASE_PUBLIC_FIELDS = `id, name, first_name, email, role`;
const getPublicFields = () =>
  hasCompanyColumnCache ? `${BASE_PUBLIC_FIELDS}, company_id` : BASE_PUBLIC_FIELDS;

const ensureUsersCompanyColumnFlag = async () => {
  if (hasCompanyColumnCache !== null) return hasCompanyColumnCache;
  const result = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_name = 'users'
       AND column_name = 'company_id'
     LIMIT 1`,
  );
  hasCompanyColumnCache = result.rows.length > 0;
  return hasCompanyColumnCache;
};
const normalizeRole = (role) => {
  if (role === "chef" || role === "chef_mission") return "chef_de_mission";
  if (role === "employe") return "collaborateur";
  return role;
};

const createUser = async (user) => {
  const {
    name,
    first_name,
    email,
    password,
    role,
    created_by = null,
    is_validated = true,
  } = user;

  const hasCompanyColumn = await ensureUsersCompanyColumnFlag();
  const insertSql = hasCompanyColumn
    ? `INSERT INTO users (name, first_name, email, password, role, company_id, created_by, is_validated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${getPublicFields()}`
    : `INSERT INTO users (name, first_name, email, password, role, created_by, is_validated)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${getPublicFields()}`;
  const params = hasCompanyColumn
    ? [name, first_name, email, password, role, user.company_id ?? null, created_by, is_validated]
    : [name, first_name, email, password, role, created_by, is_validated];
  const result = await pool.query(insertSql, params);

  return result.rows[0];
};

const getAllUsers = async ({ role: roleFilter, actor } = {}) => {
  await ensureUsersCompanyColumnFlag();
  if (normalizeRole(actor?.role) === "chef_de_mission") {
    const result = await pool.query(
      `SELECT DISTINCT ${getPublicFields()}
       FROM users u
       WHERE u.role IN ('collaborateur', 'employe')
         AND (
           u.created_by = $1
           OR u.id IN (
             SELECT ca.user_id
             FROM case_assignments ca
             JOIN cases c ON c.id = ca.case_id
             WHERE c.user_id = $1
           )
         )
       ORDER BY u.id`,
      [actor.id]
    );
    return result.rows;
  }

  let sql = `SELECT ${getPublicFields()} FROM users`;
  const params = [];
  if (roleFilter) {
    const normalizedRoleFilter = normalizeRole(roleFilter);
    sql += ` WHERE role = $1`;
    params.push(normalizedRoleFilter);
  }
  sql += ` ORDER BY id`;
  const result = await pool.query(sql, params);
  return result.rows;
};

const getUserById = async (id) => {
  await ensureUsersCompanyColumnFlag();
  const result = await pool.query(
    `SELECT ${getPublicFields()} FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const findByEmailWithPassword = async (email) => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  return result.rows[0] || null;
};

const getUserByIdWithPassword = async (id) => {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] || null;
};

const updatePassword = async (id, hashedPassword) => {
  await ensureUsersCompanyColumnFlag();
  const result = await pool.query(
    `UPDATE users
     SET password = $2
     WHERE id = $1
     RETURNING ${getPublicFields()}`,
    [id, hashedPassword],
  );
  return result.rows[0] || null;
};

const updateUserProfile = async (id, payload) => {
  const hasCompanyColumn = await ensureUsersCompanyColumnFlag();
  const { name, first_name, email, role, company_id = null } = payload;
  const sql = hasCompanyColumn
    ? `UPDATE users
       SET name = $2,
           first_name = $3,
           email = $4,
           role = $5,
           company_id = $6
       WHERE id = $1
       RETURNING ${getPublicFields()}`
    : `UPDATE users
       SET name = $2,
           first_name = $3,
           email = $4,
           role = $5
       WHERE id = $1
       RETURNING ${getPublicFields()}`;
  const params = hasCompanyColumn
    ? [id, name, first_name, email, normalizeRole(role), company_id]
    : [id, name, first_name, email, normalizeRole(role)];
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
};

const getUserAssignedMissions = async (userId) => {
  const result = await pool.query(
    `SELECT c.id,
            c.name,
            c.description,
            c.start_date,
            c.end_date,
            c.status,
            comp.name AS company_name
     FROM cases c
     LEFT JOIN companies comp ON comp.id = c.company_id
     WHERE c.user_id = $1
        OR c.id IN (SELECT ca.case_id FROM case_assignments ca WHERE ca.user_id = $1)
     ORDER BY c.id DESC`,
    [userId],
  );
  return result.rows;
};

const getPendingEmployeesCreatedByChefs = async () => {
  await ensureUsersCompanyColumnFlag();
  const result = await pool.query(
    `SELECT ${getPublicFields()}
     FROM users
     WHERE role IN ('collaborateur', 'employe')
       AND created_by IS NOT NULL
       AND COALESCE(is_validated, true) = false
     ORDER BY id`
  );
  return result.rows;
};

const validateEmployee = async (id) => {
  await ensureUsersCompanyColumnFlag();
  const result = await pool.query(
    `UPDATE users
     SET is_validated = true
     WHERE id = $1
       AND role IN ('collaborateur', 'employe')
     RETURNING ${getPublicFields()}`,
    [id]
  );
  return result.rows[0] || null;
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  findByEmailWithPassword,
  getUserByIdWithPassword,
  updatePassword,
  updateUserProfile,
  getUserAssignedMissions,
  getPendingEmployeesCreatedByChefs,
  validateEmployee,
};
