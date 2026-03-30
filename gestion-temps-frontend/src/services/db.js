import { openDB } from "idb";

const DB_NAME = "gestion_temps_db";

export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("work_hours")) {
        db.createObjectStore("work_hours", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    },
  });
};

// ajouter en local
export const addWorkHourLocal = async (data) => {
  const db = await initDB();
  return db.add("work_hours", data);
};

// récupérer local
export const getWorkHoursLocal = async () => {
  const db = await initDB();
  return db.getAll("work_hours");
};

// vider après sync
export const clearWorkHoursLocal = async () => {
  const db = await initDB();
  return db.clear("work_hours");
};