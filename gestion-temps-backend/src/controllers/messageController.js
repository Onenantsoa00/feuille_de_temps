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
    if (!otherId)
      return res.status(400).json({ message: "Utilisateur invalide" });
    const rows = await messageModel.threadBetween(req.user.id, otherId);
    await messageModel.markThreadRead(req.user.id, otherId);

    // 🔥 READ RECEIPTS - émettre aux expéditeurs que leurs messages ont été lus
    const io = req.app.get("io");
    if (io && rows.length > 0) {
      // Récupérer les IDs des messages non lus de l'autre utilisateur
      const unreadMessageIds = rows
        .filter((m) => m.from_user_id === otherId && !m.read_at)
        .map((m) => m.id);

      if (unreadMessageIds.length > 0) {
        io.to(`user_${otherId}`).emit("messageRead", {
          messageIds: unreadMessageIds,
          readBy: req.user.id,
        });
      }
    }

    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Erreur" });
  }
};

const send = async (req, res) => {
  try {
    const from_user_id = req.user.id;
    const { to_user_id, body } = req.body;

    if (!to_user_id || !body?.trim()) {
      return res.status(400).json({
        message: "Destinataire et message requis",
      });
    }

    const msg = await messageModel.create({
      from_user_id,
      to_user_id: Number(to_user_id),
      body: String(body).trim(),
    });

    // ✅ notification corrigée (content et pas title/body)
    await notificationModel.create({
      user_id: msg.to_user_id,
      content: msg.body.length > 120 ? `${msg.body.slice(0, 117)}…` : msg.body,
    });

    // ✅ SOCKET FIX
    const io = req.app.get("io");

    if (io) {
      io.to(`user_${msg.to_user_id}`).emit("newMessage", msg);
      io.to(`user_${from_user_id}`).emit("newMessage", msg);
    }

    res.status(201).json(msg);
  } catch (e) {
    console.error("SEND ERROR:", e);
    res.status(500).json({ message: "Erreur envoi" });
  }
};

module.exports = {
  conversations,
  thread,
  send,
};
