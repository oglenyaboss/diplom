const asyncHandler = require("express-async-handler");
const MaintenanceSchedule = require("../models/MaintenanceSchedule");
const Equipment = require("../models/Equipment");

// @desc    Get all maintenance schedules
// @route   GET /api/maintenance-schedules
// @access  Public
const getMaintenanceSchedules = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let filter = {};

  // Фильтры
  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.equipment_id) {
    filter.equipment_id = req.query.equipment_id;
  }

  if (req.query.responsible_technician) {
    filter.responsible_technician = req.query.responsible_technician;
  }

  if (req.query.priority) {
    filter.priority = req.query.priority;
  }

  if (req.query.maintenance_type) {
    filter.maintenance_type = req.query.maintenance_type;
  }

  // Фильтр по дате
  if (req.query.date_from || req.query.date_to) {
    filter.scheduled_date = {};
    if (req.query.date_from) {
      filter.scheduled_date.$gte = new Date(req.query.date_from);
    }
    if (req.query.date_to) {
      filter.scheduled_date.$lte = new Date(req.query.date_to);
    }
  }

  // Получаем общее количество записей
  const total = await MaintenanceSchedule.countDocuments(filter);

  // Получаем записи с пагинацией
  const maintenanceSchedules = await MaintenanceSchedule.find(filter)
    .populate("equipment_id", "name serialNumber status location")
    .sort({ scheduled_date: 1, priority: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    data: maintenanceSchedules,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get single maintenance schedule
// @route   GET /api/maintenance-schedules/:id
// @access  Public
const getMaintenanceSchedule = asyncHandler(async (req, res) => {
  const maintenanceSchedule = await MaintenanceSchedule.findById(
    req.params.id
  ).populate("equipment_id", "name serialNumber status location manufacturer");

  if (!maintenanceSchedule) {
    res.status(404);
    throw new Error("Maintenance schedule not found");
  }

  res.status(200).json({
    success: true,
    data: maintenanceSchedule,
  });
});

// @desc    Create new maintenance schedule
// @route   POST /api/maintenance-schedules
// @access  Public
const createMaintenanceSchedule = asyncHandler(async (req, res) => {
  // Проверяем, что оборудование существует
  const equipment = await Equipment.findById(req.body.equipment_id);
  if (!equipment) {
    res.status(400);
    throw new Error("Equipment not found");
  }

  // Создаем запись обслуживания
  const maintenanceSchedule = await MaintenanceSchedule.create({
    ...req.body,
    created_by: req.body.created_by || "system",
  });

  // Возвращаем созданную запись с информацией об оборудовании
  const populatedSchedule = await MaintenanceSchedule.findById(
    maintenanceSchedule._id
  ).populate("equipment_id", "name serialNumber status location manufacturer");

  res.status(201).json({
    success: true,
    data: populatedSchedule,
    message: "Maintenance schedule created successfully",
  });
});

// @desc    Update maintenance schedule
// @route   PUT /api/maintenance-schedules/:id
// @access  Public
const updateMaintenanceSchedule = asyncHandler(async (req, res) => {
  let maintenanceSchedule = await MaintenanceSchedule.findById(req.params.id);

  if (!maintenanceSchedule) {
    res.status(404);
    throw new Error("Maintenance schedule not found");
  }

  // Если статус меняется на "completed", устанавливаем дату завершения
  if (
    req.body.status === "completed" &&
    maintenanceSchedule.status !== "completed"
  ) {
    req.body.completed_date = new Date();
  }

  // Добавляем информацию о том, кто обновил
  req.body.updated_by = req.body.updated_by || "system";

  maintenanceSchedule = await MaintenanceSchedule.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  ).populate("equipment_id", "name serialNumber status location manufacturer");

  res.status(200).json({
    success: true,
    data: maintenanceSchedule,
    message: "Maintenance schedule updated successfully",
  });
});

// @desc    Delete maintenance schedule
// @route   DELETE /api/maintenance-schedules/:id
// @access  Public
const deleteMaintenanceSchedule = asyncHandler(async (req, res) => {
  const maintenanceSchedule = await MaintenanceSchedule.findById(req.params.id);

  if (!maintenanceSchedule) {
    res.status(404);
    throw new Error("Maintenance schedule not found");
  }

  await MaintenanceSchedule.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    data: {},
    message: "Maintenance schedule deleted successfully",
  });
});

// @desc    Get overdue maintenance schedules
// @route   GET /api/maintenance-schedules/overdue
// @access  Public
const getOverdueMaintenanceSchedules = asyncHandler(async (req, res) => {
  const currentDate = new Date();

  const overdueSchedules = await MaintenanceSchedule.find({
    scheduled_date: { $lt: currentDate },
    status: { $in: ["scheduled", "overdue"] },
  })
    .populate("equipment_id", "name serialNumber status location")
    .sort({ scheduled_date: 1 });

  res.status(200).json({
    success: true,
    data: overdueSchedules,
    count: overdueSchedules.length,
  });
});

// @desc    Get upcoming maintenance schedules
// @route   GET /api/maintenance-schedules/upcoming
// @access  Public
const getUpcomingMaintenanceSchedules = asyncHandler(async (req, res) => {
  const currentDate = new Date();
  const days = parseInt(req.query.days) || 7; // По умолчанию 7 дней
  const futureDate = new Date();
  futureDate.setDate(currentDate.getDate() + days);

  const upcomingSchedules = await MaintenanceSchedule.find({
    scheduled_date: {
      $gte: currentDate,
      $lte: futureDate,
    },
    status: "scheduled",
  })
    .populate("equipment_id", "name serialNumber status location")
    .sort({ scheduled_date: 1 });

  res.status(200).json({
    success: true,
    data: upcomingSchedules,
    count: upcomingSchedules.length,
    message: `Upcoming maintenance schedules for the next ${days} days`,
  });
});

// @desc    Update maintenance checklist
// @route   PUT /api/maintenance-schedules/:id/checklist/:taskIndex
// @access  Public
const updateMaintenanceChecklist = asyncHandler(async (req, res) => {
  const { id, taskIndex } = req.params;
  const { completed, completed_by, notes } = req.body;

  const maintenanceSchedule = await MaintenanceSchedule.findById(id);

  if (!maintenanceSchedule) {
    res.status(404);
    throw new Error("Maintenance schedule not found");
  }

  if (taskIndex >= maintenanceSchedule.checklist.length) {
    res.status(400);
    throw new Error("Invalid checklist task index");
  }

  // Обновляем элемент чеклиста
  maintenanceSchedule.checklist[taskIndex].completed = completed;
  if (completed) {
    maintenanceSchedule.checklist[taskIndex].completed_by =
      completed_by || "system";
    maintenanceSchedule.checklist[taskIndex].completed_at = new Date();
  }
  if (notes) {
    maintenanceSchedule.checklist[taskIndex].notes = notes;
  }

  await maintenanceSchedule.save();

  res.status(200).json({
    success: true,
    data: maintenanceSchedule,
    message: "Checklist item updated successfully",
  });
});

// @desc    Get maintenance statistics
// @route   GET /api/maintenance-schedules/stats
// @access  Public
const getMaintenanceStats = asyncHandler(async (req, res) => {
  const currentDate = new Date();

  const stats = await MaintenanceSchedule.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const overdueCount = await MaintenanceSchedule.countDocuments({
    scheduled_date: { $lt: currentDate },
    status: { $in: ["scheduled", "overdue"] },
  });

  const upcomingCount = await MaintenanceSchedule.countDocuments({
    scheduled_date: {
      $gte: currentDate,
      $lte: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
    status: "scheduled",
  });

  const totalScheduled = await MaintenanceSchedule.countDocuments({});

  const avgCost = await MaintenanceSchedule.aggregate([
    {
      $match: {
        actual_cost: { $exists: true, $gt: 0 },
      },
    },
    {
      $group: {
        _id: null,
        averageCost: { $avg: "$actual_cost" },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      statusCounts: stats,
      overdueCount,
      upcomingCount,
      totalScheduled,
      averageCost: avgCost.length > 0 ? avgCost[0].averageCost : 0,
    },
  });
});

module.exports = {
  getMaintenanceSchedules,
  getMaintenanceSchedule,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
  getOverdueMaintenanceSchedules,
  getUpcomingMaintenanceSchedules,
  updateMaintenanceChecklist,
  getMaintenanceStats,
};
