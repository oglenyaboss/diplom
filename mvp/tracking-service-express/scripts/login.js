/**
 * Скрипт для получения токена через логин/пароль
 * Использование: node login.js username password
 */

const { getTokenByLogin } = require("../services/userService");
const { logger } = require("../middleware/logger");

async function main() {
  if (process.argv.length < 4) {
    console.log("Использование: node login.js username password");
    process.exit(1);
  }

  const username = process.argv[2];
  const password = process.argv[3];

  logger.info(`Attempting to login as ${username}`);

  try {
    const token = await getTokenByLogin(username, password);

    if (token) {
      logger.info("Authentication successful");
      console.log("Token successfully obtained and saved to file.");
      process.exit(0);
    } else {
      logger.error("Failed to obtain token");
      console.error("Authentication failed. Check username and password.");
      process.exit(1);
    }
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    console.error("Error during authentication:", error.message);
    process.exit(1);
  }
}

main();
