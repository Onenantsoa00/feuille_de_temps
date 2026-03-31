const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");

const createUser = async (req, res) => {
  try {
    const { name, first_name, email, password, role, company_id } = req.body;

    if (!password || String(password).length < 6) {
      return res
        .status(400)
        .json({ message: "Mot de passe requis (6 caractères minimum)" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await userModel.createUser({
      name,
      first_name,
      email,
      password: hashedPassword,
      role,
      company_id: company_id ?? null,
    });

    res.status(201).json({
      message: "Utilisateur créé",
      user: newUser,
    });
  } catch (error) {
    console.error(error);
    if (error.code === "23505") {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }
    res.status(500).json({ message: "Erreur création user" });
  }
};

const getUsers = async (req, res) => {
  try {
    const roleFilter = req.query.role || undefined;
    const users = await userModel.getAllUsers({ role: roleFilter });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération users" });
  }
};

module.exports = {
  createUser,
  getUsers,
};
