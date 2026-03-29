const pool = require("../config/db");

// créer
const createTask = async (task) => {
  const { name, description, work_location } = task;

  const result = await pool.query(
    `INSERT INTO tasks (name, description, work_location)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, description, work_location]
  );

  return result.rows[0];
};

// lister
const getAllTasks = async () => {
  const result = await pool.query("SELECT * FROM tasks ORDER BY id DESC");
  return result.rows;
};

// modifier
const updateTask = async (id, task) => {
  const { name, description, work_location } = task;

  const result = await pool.query(
    `UPDATE tasks
     SET name=$1, description=$2, work_location=$3
     WHERE id=$4
     RETURNING *`,
    [name, description, work_location, id]
  );

  return result.rows[0];
};

// supprimer
const deleteTask = async (id) => {
  await pool.query("DELETE FROM tasks WHERE id=$1", [id]);
};

module.exports = {
  createTask,
  getAllTasks,
  updateTask,
  deleteTask,
};