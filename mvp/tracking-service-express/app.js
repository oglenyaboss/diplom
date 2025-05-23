const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { errorHandler } = require("./middleware/errorHandler");
const { loggerMiddleware, logger } = require("./middleware/logger");
const connectDB = require("./config/db");
const { initRabbitMQ } = require("./services/rabbitMQService");

// Routes
const equipmentRoutes = require("./routes/equipment");
const transferRoutes = require("./routes/transfer");
const blockchainRoutes = require("./routes/blockchain");
const operationsRoutes = require("./routes/operations");
const reportsRoutes = require("./routes/reports");

// Load environment variables
require("dotenv").config();

// Connect to MongoDB
connectDB();

// Initialize RabbitMQ
initRabbitMQ()
  .then((success) => {
    if (success) {
      logger.info("RabbitMQ initialized successfully");
    } else {
      logger.warn(
        "RabbitMQ initialization failed, continuing without message broker"
      );
    }
  })
  .catch((error) => {
    logger.error(`RabbitMQ initialization error: ${error.message}`);
  });

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(loggerMiddleware);

// Routes
app.use("/equipment", equipmentRoutes);
app.use("/transfer", transferRoutes);
app.use("/blockchain", blockchainRoutes);
app.use("/operations", operationsRoutes);
app.use("/reports", reportsRoutes);

// Health check
app.get("/ping", async (req, res) => {
  try {
    // Импортируем сервис блокчейна для получения информации о состоянии
    const { getBlockchainStatus } = require("./services/blockchainService");
    const mongoose = require("mongoose");
    const rabbitMQService = require("./services/rabbitMQService");

    // Получаем информацию о системе
    const os = require("os");
    const blockchainStatus = await getBlockchainStatus();
    const uptime = process.uptime();

    // Получаем версию из package.json
    const packageJson = require("./package.json");

    // Формируем ответ
    const response = {
      status: "ok",
      service: "tracking-service",
      version: packageJson.version || "1.0.0",
      time: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime),
        formatted: formatUptime(uptime),
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        memory: {
          free: Math.round(os.freemem() / (1024 * 1024)) + " MB",
          total: Math.round(os.totalmem() / (1024 * 1024)) + " MB",
        },
      },
      blockchain: {
        connected: blockchainStatus.connected,
        network: blockchainStatus.networkName,
        chainId: blockchainStatus.chainId,
        contractAddress: blockchainStatus.contractAddress,
        nodeUrl: blockchainStatus.nodeUrl || "not configured",
      },
      database: {
        connected: mongoose.connection.readyState === 1,
        readyState: getMongooseReadyStateText(mongoose.connection.readyState),
      },
      rabbitMQ: {
        connected: rabbitMQService.isConnected(),
      },
    };

    res.json(response);
  } catch (error) {
    // В случае ошибки возвращаем базовую информацию
    res.json({
      status: "warning",
      service: "tracking-service",
      time: new Date().toISOString(),
      message: "Error retrieving extended status information",
      error: error.message,
    });
  }
});

// Функция для форматирования времени работы
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

// Функция для получения текстового представления состояния соединения с MongoDB
function getMongooseReadyStateText(state) {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
    99: "uninitialized",
  };
  return states[state] || "unknown";
}

// Error Handler
app.use(errorHandler);

module.exports = app;
