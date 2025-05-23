const asyncHandler = require("express-async-handler");
const Report = require("../models/Report");
const Equipment = require("../models/Equipment");
const Transfer = require("../models/Transfer");
const { logger } = require("../middleware/logger");
const mongoose = require("mongoose");
const { getUserById } = require("../services/userService");

// Генерация номера отчета
const generateReportNumber = async () => {
  const date = new Date();
  const year = date.getFullYear();

  // Находим последний отчет за текущий год
  const latestReport = await Report.findOne(
    { number: new RegExp(`R-\\d+/${year}$`) },
    {},
    { sort: { number: -1 } }
  );

  let nextNumber = 1;
  if (latestReport) {
    // Извлекаем номер из формата "R-X/YYYY"
    const match = latestReport.number.match(/R-(\d+)\//);
    if (match && match[1]) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  return `R-${nextNumber}/${year}`;
};

// Получение информации о пользователе
const getUserInfo = async (userId) => {
  const user = await getUserById(userId);
  return {
    id: user.id,
    name: `${user.first_name} ${user.last_name}`,
    position: user.position
  };
};

// Получение имени держателя
const getHolderName = async (holderId) => {
  if (!holderId) {
    return {
      name: "Склад",
      position: "",
    };
  }

  const user = await getUserById(holderId);
  return {
    name: `${user.first_name} ${user.last_name}`,
    position: user.position
  };
};

// @desc    Create a new report
// @route   POST /reports
// @access  Private (требует аутентификации)
const createReport = asyncHandler(async (req, res) => {
  const {
    title,
    type,
    startDate,
    endDate,
    equipmentId,
    departmentId,
    notes,
    createdBy // Объект с информацией о создателе отчета
  } = req.body;

  // Проверяем наличие createdBy.id
  if (!createdBy?.id) {
    res.status(400);
    throw new Error("ID создателя отчета обязателен");
  }

  // Проверка обязательных полей
  if (!title || !type || !startDate || !endDate) {
    res.status(400);
    throw new Error("Не заполнены обязательные поля");
  }

  // Проверка корректности типа отчета
  const validTypes = ["individual", "department", "period"];
  if (!validTypes.includes(type)) {
    res.status(400);
    throw new Error("Неверный тип отчета");
  }

  // Проверка наличия ID оборудования для отчета по оборудованию
  if (type === "individual" && !equipmentId) {
    res.status(400);
    throw new Error(
      "Для отчета по оборудованию необходимо указать ID оборудования"
    );
  }

  // Проверка наличия ID подразделения для отчета по подразделению
  if (type === "department" && !departmentId) {
    res.status(400);
    throw new Error(
      "Для отчета по подразделению необходимо указать ID подразделения"
    );
  }

  try {
    // Генерация номера отчета
    const reportNumber = await generateReportNumber();

    // Получение информации о создателе отчета
    const userInfo = await getUserInfo(createdBy.id);

    // Создание отчета
    const report = new Report({
      number: reportNumber,
      title,
      type,
      status: "final",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      createdBy: {
        id: createdBy.id,
        name: userInfo.name,
        position: userInfo.position
      },
      transfers: [],
      notes,
      equipmentId: type === "individual" ? equipmentId : undefined,
      departmentId: type === "department" ? departmentId : undefined,
    });

    // Поиск перемещений для отчета
    let transfers = [];

    // Запрос перемещений в зависимости от типа отчета
    const query = {
      transferDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
    };

    if (type === "individual") {
      query.equipmentId = mongoose.Types.ObjectId(equipmentId);
    }

    // Для отчета по подразделению нужно учесть, что departmentId может быть у fromHolderId или toHolderId
    if (type === "department") {
      query.$or = [
        { fromHolderId: departmentId },
        { toHolderId: departmentId },
      ];
    }

    // Поиск перемещений
    const transferRecords = await Transfer.find(query).populate("equipmentId");

    // Преобразование перемещений в формат отчета
    for (const transfer of transferRecords) {
      // Получение информации о держателях
      const fromHolder = await getHolderName(transfer.fromHolderId);
      const toHolder = await getHolderName(transfer.toHolderId);

      // Создание элемента отчета
      const reportTransferItem = {
        equipmentId: transfer.equipmentId._id,
        equipmentName: transfer.equipmentId.name,
        serialNumber: transfer.equipmentId.serialNumber,
        category: transfer.equipmentId.category,
        fromHolder: {
          id: transfer.fromHolderId,
          name: fromHolder.name,
          position: fromHolder.position,
        },
        toHolder: {
          id: transfer.toHolderId,
          name: toHolder.name,
          position: toHolder.position,
        },
        transferDate: transfer.transferDate,
        transferReason: transfer.transferReason,
        blockchainTxId: transfer.blockchainTxId,
      };

      report.transfers.push(reportTransferItem);
    }

    // Сохранение отчета
    await report.save();

    logger.info(`Report created: ${reportNumber}`);
    res.status(201).json(report);
  } catch (error) {
    logger.error(`Error creating report: ${error.message}`);
    res.status(500);
    throw new Error(`Ошибка создания отчета: ${error.message}`);
  }
});

// @desc    Get all reports
// @route   GET /reports
// @access  Private
const getReports = asyncHandler(async (req, res) => {
  const { type } = req.query;

  try {
    // Поиск отчетов с фильтром по типу (если указан)
    const query = type ? { type } : {};
    const reports = await Report.find(query).sort({ createdAt: -1 });

    res.status(200).json(reports);
  } catch (error) {
    logger.error(`Error fetching reports: ${error.message}`);
    res.status(500);
    throw new Error(`Ошибка получения отчетов: ${error.message}`);
  }
});

// @desc    Get report by ID
// @route   GET /reports/:id
// @access  Private
const getReportById = asyncHandler(async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      res.status(404);
      throw new Error("Отчет не найден");
    }

    res.status(200).json(report);
  } catch (error) {
    logger.error(`Error fetching report: ${error.message}`);
    if (error.kind === "ObjectId") {
      res.status(404);
      throw new Error("Отчет не найден");
    }
    res.status(500);
    throw new Error(`Ошибка получения отчета: ${error.message}`);
  }
});

// @desc    Delete report by ID
// @route   DELETE /reports/:id
// @access  Private
const deleteReport = asyncHandler(async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      res.status(404);
      throw new Error("Отчет не найден");
    }

    await Report.deleteOne({ _id: req.params.id });

    logger.info(`Report deleted: ${report.number}`);
    res.status(200).json({ message: "Отчет успешно удален" });
  } catch (error) {
    logger.error(`Error deleting report: ${error.message}`);
    if (error.kind === "ObjectId") {
      res.status(404);
      throw new Error("Отчет не найден");
    }
    res.status(500);
    throw new Error(`Ошибка удаления отчета: ${error.message}`);
  }
});

module.exports = {
  createReport,
  getReports,
  getReportById,
  deleteReport,
};
