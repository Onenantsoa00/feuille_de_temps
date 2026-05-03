const ROLES = [
  "admin",
  "expert_comptable",
  "secretaire",
  "chef_de_mission",
  "chef_mission",
  "chef",
  "collaborateur",
  "employe",
];

const normalizeRole = (role) => {
  if (role === "chef" || role === "chef_mission") return "chef_de_mission";
  if (role === "employe") return "collaborateur";
  return role;
};

function validateCreateUserRole(req, res, next) {
  const role = req.body?.role;
  const normalizedTargetRole = normalizeRole(role);
  if (!role || !ROLES.includes(role)) {
    return res.status(400).json({ message: "Rôle invalide" });
  }

  const actor = normalizeRole(req.user?.role);
  if (actor === "secretaire") {
    if (!["collaborateur", "chef_de_mission"].includes(normalizedTargetRole)) {
      return res
        .status(403)
        .json({
          message:
            "La secrétaire ne peut créer que collaborateur ou chef de mission",
        });
    }
  } else if (actor === "chef_de_mission") {
    if (normalizedTargetRole !== "collaborateur") {
      return res
        .status(403)
        .json({ message: "Le chef de mission ne peut créer que des collaborateurs" });
    }
  } else if (actor !== "admin" && actor !== "expert_comptable") {
    return res.status(403).json({ message: "Accès refusé" });
  }

  req.body.role = normalizedTargetRole;

  next();
}

module.exports = { validateCreateUserRole, ROLES };
