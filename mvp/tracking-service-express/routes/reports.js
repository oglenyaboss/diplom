const express = require("express");
const router = express.Router();
const {
  createReport,
  getReports,
  getReportById,
  deleteReport,
} = require("../controllers/reportsController");

// Маршруты для работы с отчетами
router.post("/", createReport);
router.get("/", getReports);
router.get("/:id", getReportById);
router.delete("/:id", deleteReport);

module.exports = router;
