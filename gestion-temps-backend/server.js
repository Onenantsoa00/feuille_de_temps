require("dotenv").config();

const app = require("./src/app");
const { seedAdmin } = require("./src/utils/seedAdmin");

const PORT = 3000;

async function start() {
  try {
    await seedAdmin();
  } catch (e) {
    console.error("Seed admin:", e.message);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Serveur lancé sur http://0.0.0.0:${PORT}`);
  });
}

start();
