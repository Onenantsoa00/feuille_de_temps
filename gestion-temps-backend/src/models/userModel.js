const pool = require("../config/db");

// Créer un utilisateur
const createUser = async (user) => {
  const { name, first_name, email, password, role } = user;

  const result = await pool.query(
    `INSERT INTO users (name, first_name, email, password, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, first_name, email, password, role]
  );

  return result.rows[0];
};

// Récupérer tous les utilisateurs
const getAllUsers = async () => {
  const result = await pool.query("SELECT * FROM users");
  return result.rows;
};

module.exports = {
  createUser,
  getAllUsers,
};
