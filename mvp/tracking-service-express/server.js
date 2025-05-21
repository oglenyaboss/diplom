const app = require("./app");
const { logger } = require("./middleware/logger");
const { closeRabbitMQ } = require("./services/rabbitMQService");

const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, () => {
  logger.info(
    `Server running in ${
      process.env.NODE_ENV || "development"
    } mode on port ${PORT}`
  );
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info("Shutting down server...");

  // Close RabbitMQ connection
  await closeRabbitMQ();

  // Close server
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });

  // Force close after timeout
  setTimeout(() => {
    logger.error(
      "Could not close connections in time, forcefully shutting down"
    );
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error(`Error: ${err.message}`);
  // Close server & exit process
  gracefulShutdown();
});
