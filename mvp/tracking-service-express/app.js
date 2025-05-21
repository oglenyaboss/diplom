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

// Health check
app.get("/ping", (req, res) => {
  res.json({
    status: "ok",
    service: "tracking-service",
    time: new Date().toISOString(),
  });
});

// Error Handler
app.use(errorHandler);

module.exports = app;
