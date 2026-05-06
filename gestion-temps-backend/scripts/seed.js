const pool = require("../config/db");
const bcrypt = require("bcrypt");

async function seed() {
  const password = await bcrypt.hash("Admin123!", 10);

  await pool.query(`
    INSERT INTO users (name, email, password, role)
    VALUES 
      ('Bruno', 'admin@admin.local', '${password}', 'admin')
    ON CONFLICT (email) DO NOTHING;
  `);

  console.log("✅ Utilisateur créé");
  process.exit();
}

seed();
