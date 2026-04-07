const notificationModel = require("../models/notificationModel");

const list = async (req, res) => {
  try {
    const unread = req.query.unread === "1";
    const rows = await notificationModel.listForUser(req.user.id, {
      unreadOnly: unread,
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Erreur notifications" });
  }
};

const unreadCount = async (req, res) => {
  try {
    const n = await notificationModel.countUnread(req.user.id);
    res.json({ count: n });
  } catch (e) {
    res.status(500).json({ message: "Erreur" });
  }
};

const markRead = async (req, res) => {
  try {
    const row = await notificationModel.markRead(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ message: "Introuvable" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ message: "Erreur" });
  }
};

const markAllRead = async (req, res) => {
  try {
    await notificationModel.markAllRead(req.user.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "Erreur" });
  }
};

const createForUser = async (req, res) => {
  try {
    const { user_id, title, body } = req.body;

    if (!user_id || !title) {
      return res.status(400).json({ message: "user_id et title requis" });
    }

    const content = `${title} - ${body || ""}`;

    const row = await notificationModel.create({
      user_id: Number(user_id),
      content,
    });

    // 🔥 SOCKET
    const io = req.app.get("io");

    io.to(`user_${user_id}`).emit("newNotification", row);

    // 🔥 ENVOYER LE NOUVEAU COUNT
    const count = await notificationModel.countUnread(user_id);

    io.to(`user_${user_id}`).emit("notificationCount", count);

    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ message: "Erreur création notification" });
  }
};

module.exports = {
  list,
  unreadCount,
  markRead,
  markAllRead,
  createForUser,
};
