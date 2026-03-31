const messageModel = require("../models/messageModel");
const notificationModel = require("../models/notificationModel");

const conversations = async (req, res) => {
  try {
    const rows = await messageModel.recentConversations(req.user.id);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Erreur messagerie" });
  }
};

const thread = async (req, res) => {
  try {
    const otherId = Number(req.params.userId);
    if (!otherId) return res.status(400).json({ message: "Utilisateur invalide" });
    const rows = await messageModel.threadBetween(req.user.id, otherId);
    await messageModel.markThreadRead(req.user.id, otherId);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Erreur" });
  }
};

const send = async (req, res) => {
  try {
    const { to_user_id, body } = req.body;
    if (!to_user_id || !body?.trim()) {
      return res.status(400).json({ message: "Destinataire et message requis" });
    }
    const row = await messageModel.create({
      from_user_id: req.user.id,
      to_user_id: Number(to_user_id),
      body: String(body).trim(),
    });

    await notificationModel.create({
      user_id: row.to_user_id,
      title: "Nouveau message",
      body:
        row.body.length > 120 ? `${row.body.slice(0, 117)}…` : row.body,
    });

    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ message: "Erreur envoi" });
  }
};

module.exports = {
  conversations,
  thread,
  send,
};
