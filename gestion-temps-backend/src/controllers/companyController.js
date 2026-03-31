const companyModel = require("../models/companyModel");

const getCompanies = async (req, res) => {
  try {
    const companies = await companyModel.getAllCompanies();
    res.json(companies);
  } catch (error) {
    console.error("GET COMPANIES ERROR:", error);
    res.status(500).json({ message: "Erreur récupération entreprises" });
  }
};

const createCompany = async (req, res) => {
  try {
    const company = await companyModel.createCompany(req.body);
    res.status(201).json(company);
  } catch (error) {
    console.error("CREATE COMPANY ERROR:", error);
    res.status(500).json({ message: "Erreur création entreprise" });
  }
};

const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await companyModel.updateCompany(id, req.body);
    if (!row) return res.status(404).json({ message: "Société introuvable" });
    res.json(row);
  } catch (error) {
    console.error("UPDATE COMPANY ERROR:", error);
    res.status(500).json({ message: "Erreur mise à jour" });
  }
};

const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    await companyModel.deleteCompany(id);
    res.json({ message: "Supprimé" });
  } catch (error) {
    console.error("DELETE COMPANY ERROR:", error);
    res.status(500).json({ message: "Erreur suppression" });
  }
};

module.exports = {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
};
