const winston = require("winston");

// Define the Winston logger configuration
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "tracking-service" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`
        )
      ),
    }),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

// Middleware to log HTTP requests
const loggerMiddleware = (req, res, next) => {
  const start = new Date();

  res.on("finish", () => {
    const duration = new Date() - start;
    logger.info(
      `${res.statusCode} ${req.method} ${req.url} - ${duration}ms | IP: ${req.ip}`
    );
  });

  next();
};

module.exports = { logger, loggerMiddleware };
