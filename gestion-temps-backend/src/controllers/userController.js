const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");
const { sendUserInvitationEmail } = require("../utils/emailService");
const normalizeRole = (role) => {
  if (role === "chef" || role === "chef_mission") return "chef_de_mission";
  if (role === "employe") return "collaborateur";
  return role;
};

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
      is_validated:
        normalizeRole(req.user.role) === "chef_de_mission" ? false : true,
    });

    let invitationSent = false;
    try {
      await sendUserInvitationEmail({
        to: email,
        firstName: first_name,
        email,
        plainPassword: password,
      });
      invitationSent = true;
    } catch (mailError) {
      console.error("INVITATION EMAIL ERROR:", mailError.message);
    }

    res.status(201).json({
      message: invitationSent
        ? "Utilisateur créé et invitation envoyée"
        : "Utilisateur créé mais invitation email non envoyée",
      invitation_sent: invitationSent,
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

const updateUser = async (req, res) => {
  try {
    const user = await userModel.updateUserProfile(
      Number(req.params.id),
      req.body,
    );
    if (!user)
      return res.status(404).json({ message: "Utilisateur introuvable" });
    res.json({ message: "Utilisateur modifié", user });
  } catch (error) {
    console.error(error);
    if (error.code === "23505") {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }
    res.status(500).json({ message: "Erreur modification utilisateur" });
  }
};

const getUserMissions = async (req, res) => {
  try {
    const missions = await userModel.getUserAssignedMissions(
      Number(req.params.id),
    );
    res.json(missions);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Erreur récupération missions utilisateur" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({
        message: "Nouveau mot de passe requis (6 caractères minimum)",
      });
    }
    const currentUser = await userModel.getUserByIdWithPassword(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }
    const isMatch = await bcrypt.compare(
      currentPassword || "",
      currentUser.password,
    );
    if (!isMatch) {
      return res.status(400).json({ message: "Mot de passe actuel incorrect" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userModel.updatePassword(req.user.id, hashedPassword, newPassword);
    res.json({ message: "Mot de passe modifié" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur modification mot de passe" });
  }
};

const adminChangeUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({
        message: "Nouveau mot de passe requis (6 caractères minimum)",
      });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await userModel.updatePassword(
      Number(req.params.id),
      hashedPassword,
      newPassword,
    );
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }
    res.json({ message: "Mot de passe modifié" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Erreur modification mot de passe utilisateur" });
  }
};

const getUsers = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }
    const roleFilter = req.query.role || undefined;
    const isAdmin = normalizeRole(req.user.role) === "admin";
    const users = await userModel.getAllUsers({
      role: roleFilter,
      actor: req.user,
      includePlainPassword: isAdmin,
    });
    res.json(users);
  } catch (error) {
    console.error("GET USERS ERROR:", error);
    res.status(500).json({ message: "Erreur récupération users" });
  }
};

const getPendingEmployees = async (_req, res) => {
  try {
    const users = await userModel.getPendingEmployeesCreatedByChefs();
    res.json(users);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Erreur récupération validations employés" });
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
  changePassword,
  updateUser,
  getUserMissions,
  adminChangeUserPassword,
};
