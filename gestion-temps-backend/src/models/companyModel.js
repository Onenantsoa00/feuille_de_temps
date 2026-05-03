const pool = require("../config/db");

const createCompany = async (company) => {
  const { name, description = null, address = null, contact = null } = company;
  const result = await pool.query(
    `INSERT INTO companies (name, description, address, contact)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, description, address, contact]
  );
  return result.rows[0];
};

const getAllCompanies = async () => {
  const result = await pool.query("SELECT * FROM companies ORDER BY id DESC");
  return result.rows;
};

const updateCompany = async (id, { name, description = null, address = null, contact = null }) => {
  const result = await pool.query(
    `UPDATE companies
     SET name = $1, description = $2, address = $3, contact = $4
     WHERE id = $5
     RETURNING *`,
    [name, description, address, contact, id]
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
