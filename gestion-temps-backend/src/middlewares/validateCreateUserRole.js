const ROLES = ["admin", "secretaire", "chef_mission", "employe"];

function validateCreateUserRole(req, res, next) {
  const role = req.body?.role;
  if (!role || !ROLES.includes(role)) {
    return res.status(400).json({ message: "Rôle invalide" });
  }

  const actor = req.user?.role;
  if (actor === "secretaire") {
    if (!["employe", "chef_mission"].includes(role)) {
      return res
        .status(403)
        .json({ message: "La secrétaire ne peut créer que employé ou chef de mission" });
    }
  } else if (actor !== "admin") {
    return res.status(403).json({ message: "Accès refusé" });
  }

  next();
}

module.exports = { validateCreateUserRole, ROLES };
