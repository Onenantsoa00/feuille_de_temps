const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Vérifie si le token existe
    if (!authHeader) {
      return res.status(401).json({
        message: "Token manquant",
      });
    }

    // Format : Bearer TOKEN
    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // On injecte l'utilisateur dans req
    req.user = decoded;

    next();
  } catch (error) {
    console.error("JWT ERROR:", error.message);
    return res.status(403).json({
      message: "Token invalide",
    });
  }
};

module.exports = verifyToken;