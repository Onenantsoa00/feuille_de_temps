const pool = require("../config/db");

const PUBLIC_FIELDS = `id, name, first_name, email, role`;

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

  const result = await pool.query(
    `INSERT INTO users (name, first_name, email, password, role, created_by, is_validated)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${PUBLIC_FIELDS}`,
    [name, first_name, email, password, role, created_by, is_validated]
  );

  return result.rows[0];
};

const getAllUsers = async ({ role: roleFilter, actor } = {}) => {
  if (actor?.role === "chef_mission") {
    const result = await pool.query(
      `SELECT DISTINCT ${PUBLIC_FIELDS}
       FROM users u
       WHERE u.role = 'employe'
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

  let sql = `SELECT ${PUBLIC_FIELDS} FROM users`;
  const params = [];
  if (roleFilter) {
    sql += ` WHERE role = $1`;
    params.push(roleFilter);
  }
  sql += ` ORDER BY id`;
  const result = await pool.query(sql, params);
  return result.rows;
};

const getUserById = async (id) => {
  const result = await pool.query(
    `SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`,
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

const getPendingEmployeesCreatedByChefs = async () => {
  const result = await pool.query(
    `SELECT ${PUBLIC_FIELDS}
     FROM users
     WHERE role = 'employe'
       AND created_by IS NOT NULL
       AND COALESCE(is_validated, true) = false
     ORDER BY id`
  );
  return result.rows;
};

const validateEmployee = async (id) => {
  const result = await pool.query(
    `UPDATE users
     SET is_validated = true
     WHERE id = $1
       AND role = 'employe'
     RETURNING ${PUBLIC_FIELDS}`,
    [id]
  );
  return result.rows[0] || null;
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  findByEmailWithPassword,
  getPendingEmployeesCreatedByChefs,
  validateEmployee,
};
