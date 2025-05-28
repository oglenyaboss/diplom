const express = require("express");
const router = express.Router();

const {
  getMaintenanceSchedules,
  getMaintenanceSchedule,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
  getOverdueMaintenanceSchedules,
  getUpcomingMaintenanceSchedules,
  updateMaintenanceChecklist,
  getMaintenanceStats,
} = require("../controllers/maintenanceController");

// Специальные маршруты (должны быть перед параметризованными)
router.get("/overdue", getOverdueMaintenanceSchedules);
router.get("/upcoming", getUpcomingMaintenanceSchedules);
router.get("/stats", getMaintenanceStats);

// Основные CRUD маршруты
router.route("/").get(getMaintenanceSchedules).post(createMaintenanceSchedule);

router
  .route("/:id")
  .get(getMaintenanceSchedule)
  .put(updateMaintenanceSchedule)
  .delete(deleteMaintenanceSchedule);

// Специальный маршрут для обновления чеклиста
router.put("/:id/checklist/:taskIndex", updateMaintenanceChecklist);

module.exports = router;
