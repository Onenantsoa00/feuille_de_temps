const pool = require("../config/db");

const createCompany = async (company) => {
  const { name } = company;
  const result = await pool.query(
    `INSERT INTO companies (name) VALUES ($1) RETURNING *`,
    [name]
  );
  return result.rows[0];
};

const getAllCompanies = async () => {
  const result = await pool.query("SELECT * FROM companies ORDER BY id DESC");
  return result.rows;
};

const updateCompany = async (id, { name }) => {
  const result = await pool.query(
    `UPDATE companies SET name = $1 WHERE id = $2 RETURNING *`,
    [name, id]
  );
  return result.rows[0] || null;
};

const deleteCompany = async (id) => {
  await pool.query("DELETE FROM companies WHERE id = $1", [id]);
};

module.exports = {
  createCompany,
  getAllCompanies,
  updateCompany,
  deleteCompany,
};
