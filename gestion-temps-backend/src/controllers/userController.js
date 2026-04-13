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
      created_by: req.user.id,
      is_validated: req.user.role === "chef_mission" ? false : true,
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
    const users = await userModel.getAllUsers({
      role: roleFilter,
      actor: req.user,
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération users" });
  }
};

const getPendingEmployees = async (_req, res) => {
  try {
    const users = await userModel.getPendingEmployeesCreatedByChefs();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur récupération validations employés" });
  }
};

const validateEmployee = async (req, res) => {
  try {
    const user = await userModel.validateEmployee(Number(req.params.id));
    if (!user) {
      return res.status(404).json({ message: "Employé introuvable" });
    }
    res.json({ message: "Employé validé", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur validation employé" });
  }
};

module.exports = {
  createUser,
  getUsers,
  getPendingEmployees,
  validateEmployee,
};
