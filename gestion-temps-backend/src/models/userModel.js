const pool = require("../config/db");

const PUBLIC_FIELDS = `id, name, first_name, email, role`;

const createUser = async (user) => {
  const { name, first_name, email, password, role } = user;

  const result = await pool.query(
    `INSERT INTO users (name, first_name, email, password, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${PUBLIC_FIELDS}`,
    [name, first_name, email, password, role]
  );

  return result.rows[0];
};

const getAllUsers = async ({ role: roleFilter } = {}) => {
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

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  findByEmailWithPassword,
};
