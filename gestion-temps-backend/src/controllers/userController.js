const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");

// Ajouter un utilisateur
const createUser = async (req, res) => {
  try {
    const { name, first_name, email, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await userModel.createUser({
      name,
      first_name,
      email,
      password: hashedPassword,
      role,
    });

    res.status(201).json({
      message: "Utilisateur créé",
      user: newUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur création user" });
  }
};

// Lister utilisateurs
const getUsers = async (req, res) => {
  try {
    const users = await userModel.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération users" });
  }
};

module.exports = {
  createUser,
  getUsers,
};
