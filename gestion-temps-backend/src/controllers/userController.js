const userModel = require("../models/userModel");

// Ajouter un utilisateur
const createUser = async (req, res) => {
  try {
    const user = await userModel.createUser(req.body);
    res.json(user);
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
