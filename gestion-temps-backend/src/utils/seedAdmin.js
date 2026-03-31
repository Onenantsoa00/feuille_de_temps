const bcrypt = require("bcrypt");
const pool = require("../config/db");

const DEFAULT_EMAIL =
  process.env.DEFAULT_ADMIN_EMAIL || "admin@admin.local";
const DEFAULT_PASSWORD =
  process.env.DEFAULT_ADMIN_PASSWORD || "Admin123!";

async function seedAdmin() {
  const result = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [DEFAULT_EMAIL]
  );
  if (result.rows.length > 0) return;

  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (name, first_name, email, password, role)
     VALUES ($1, $2, $3, $4, $5)`,
    ["Administrateur", "Super", DEFAULT_EMAIL, hash, "admin"]
  );
  console.log(
    `[seed] Compte admin créé: ${DEFAULT_EMAIL} / (voir DEFAULT_ADMIN_PASSWORD ou défaut)`
  );
}

module.exports = { seedAdmin, DEFAULT_EMAIL };
