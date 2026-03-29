const taskModel = require("../models/taskModel");

// create
const createTask = async (req, res) => {
  try {
    const task = await taskModel.createTask(req.body);
    res.status(201).json(task);
  } catch (error) {
    console.error("CREATE TASK ERROR:", error);
    res.status(500).json({ message: "Erreur création tâche" });
  }
};

// get all
const getTasks = async (req, res) => {
  try {
    const tasks = await taskModel.getAllTasks();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération tâches" });
  }
};

// update
const updateTask = async (req, res) => {
  try {
    const task = await taskModel.updateTask(req.params.id, req.body);
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Erreur modification tâche" });
  }
};

// delete
const deleteTask = async (req, res) => {
  try {
    await taskModel.deleteTask(req.params.id);
    res.json({ message: "Tâche supprimée" });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression tâche" });
  }
};

module.exports = {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
};