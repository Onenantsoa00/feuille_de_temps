require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./src/app");
const { seedAdmin } = require("./src/utils/seedAdmin");
const notificationModel = require("./src/models/notificationModel");

const PORT = process.env.PORT || 3000;

const toIsoDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getPreviousBusinessDay = (referenceDate = new Date()) => {
  const d = new Date(referenceDate);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  return d;
};

const isMorningRunWindow = (d = new Date()) =>
  d.getHours() >= 6 && d.getHours() < 12;

async function runMissingTimesheetReminder(io) {
  const now = new Date();
  if (!isMorningRunWindow(now)) return;
  const targetDate = getPreviousBusinessDay(now);
  const workDate = toIsoDate(targetDate);
  const inserted = await notificationModel.notifyMissingTimesheetForDate({
    workDate,
  });
  for (const row of inserted) {
    io.to(`user_${row.user_id}`).emit("newNotification", row);
    const count = await notificationModel.countUnread(row.user_id);
    io.to(`user_${row.user_id}`).emit("notificationCount", count);
  }
}

function scheduleDailyReminder(io) {
  let lastRunDate = null;
  const tick = async () => {
    const today = toIsoDate(new Date());
    if (lastRunDate === today) return;
    try {
      await runMissingTimesheetReminder(io);
      lastRunDate = today;
    } catch (error) {
      console.error("Missing timesheet reminder error:", error.message);
    }
  };
  tick();
  setInterval(tick, 60 * 60 * 1000);
}

async function start() {
  try {
    // Test DB connection
    const pool = require("./src/config/db");
    await pool.query("SELECT 1");
    console.log("✅ DB connected");
  } catch (e) {
    console.error("❌ DB connection failed:", e.message);
    process.exit(1);
  }

  try {
    await seedAdmin();
  } catch (e) {
    console.error("Seed admin:", e.message);
  }

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  app.set("io", io);

  io.on("connection", (socket) => {
    console.log("🔌 Client connecté:", socket.id);

    socket.on("joinUserRoom", (userId) => {
      socket.join(`user_${userId}`);
      console.log(`👤 user_${userId} joined`);
    });

    socket.on("notificationRead", async (userId) => {
      const count = await notificationModel.countUnread(userId);
      io.to(`user_${userId}`).emit("notificationCount", count);
    });

    // 🔥 TYPING INDICATOR
    socket.on("typing", (data) => {
      socket
        .to(`user_${data.toUserId}`)
        .emit("userTyping", { fromUserId: data.fromUserId });
    });

    socket.on("stopTyping", (data) => {
      socket
        .to(`user_${data.toUserId}`)
        .emit("userStopTyping", { fromUserId: data.fromUserId });
    });

    // 🔥 READ RECEIPTS
    socket.on("messageRead", (data) => {
      // Émettre à l'expéditeur que ses messages ont été lus
      socket.to(`user_${data.fromUserId}`).emit("messageRead", {
        messageIds: data.messageIds,
        readBy: data.readBy,
      });
    });

    socket.on("disconnect", () => {
      console.log("❌ Déconnecté:", socket.id);
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    scheduleDailyReminder(io);
    console.log("Server running");
    console.log(`Serveur lancé sur http://0.0.0.0:${PORT}`);
  });
}

start();
