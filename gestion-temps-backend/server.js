require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./src/app");
const { seedAdmin } = require("./src/utils/seedAdmin");
const notificationModel = require("./src/models/notificationModel");

const PORT = 3000;

async function start() {
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
    console.log(`Serveur lancé sur http://0.0.0.0:${PORT}`);
  });
}

start();
