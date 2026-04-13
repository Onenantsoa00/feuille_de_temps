const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifier utilisateur
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    const user = result.rows[0];

    // Vérifier password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Mot de passe incorrect" });
    }

    if (user.role === "employe" && user.is_validated === false) {
      return res.status(403).json({
        message: "Votre compte employé doit être validé par un administrateur",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        first_name: user.first_name,
        email: user.email,
        role: user.role,
        company_id: user.company_id ?? null,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur login" });
  }
};

module.exports = { login };