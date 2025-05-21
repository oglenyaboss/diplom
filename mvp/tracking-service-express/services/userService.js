const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { logger } = require("../middleware/logger");

// Constants
const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || "http://localhost:8000";
const TOKEN_FILE = path.join(__dirname, "../scripts/token.json");

// Кеш адресов пользователей для уменьшения количества запросов к auth-service
// { userId: { ethAddress: '0x...', lastUpdated: timestamp } }
const userCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 минут

// Получение токена авторизации из файла
const getAuthToken = () => {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
      if (tokenData && tokenData.token) {
        return tokenData.token;
      }
    }
    logger.warn("Auth token not found in token file");
    return null;
  } catch (error) {
    logger.error(`Failed to read auth token: ${error.message}`);
    return null;
  }
};

// Обновление токена через refresh token
const refreshAuthToken = async () => {
  try {
    // Читаем текущие данные токена из файла
    if (!fs.existsSync(TOKEN_FILE)) {
      logger.error("Token file not found for refresh");
      return null;
    }

    const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
    if (!tokenData || !tokenData.refreshToken) {
      logger.error("No refresh token available in token file");
      return null;
    }

    logger.info("Attempting to refresh expired auth token");
    const response = await axios.post(
      `${AUTH_SERVICE_URL}/token/refresh`,
      { refresh_token: tokenData.refreshToken },
      {
        headers: {
          Authorization: `Bearer ${tokenData.token}`,
        },
      }
    );

    if (response.data && response.data.token) {
      logger.info("Token refresh successful");

      // Сохраняем новый токен в файл
      const newTokenData = {
        token: response.data.token,
        refreshToken: response.data.refresh_token || tokenData.refreshToken,
        expiresAt: response.data.expires_at || null,
        obtainedAt: new Date().toISOString(),
      };

      fs.writeFileSync(TOKEN_FILE, JSON.stringify(newTokenData, null, 2));
      logger.info("New token saved to file");

      return response.data.token;
    } else {
      logger.error("Token refresh response did not contain a new token");
      return null;
    }
  } catch (error) {
    logger.error(`Failed to refresh auth token: ${error.message}`);
    if (error.response) {
      logger.error(`Response status: ${error.response.status}`);
      logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
};

// Получение данных пользователя по ID
const getUserById = async (userId) => {
  // Проверяем кеш
  const cachedUser = userCache.get(userId);
  const now = Date.now();

  if (cachedUser && now - cachedUser.lastUpdated < CACHE_TTL) {
    logger.info(`Using cached user data for user ID ${userId}`);
    return cachedUser;
  }

  // Если userId равен 0 или null, возвращаем null (это склад)
  if (userId === 0 || userId === "0" || userId === null) {
    logger.info(`User ID is warehouse (${userId}), skipping API call`);
    return null;
  }

  try {
    let token = getAuthToken();
    if (!token) {
      logger.error("No auth token available, cannot fetch user data");
      throw new Error("Authentication token not available");
    }

    logger.info(`Fetching user data for ID: ${userId} from auth service`);
    let response;
    try {
      response = await axios.get(`${AUTH_SERVICE_URL}/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      // Если получили ошибку 401 (Unauthorized), пробуем обновить токен
      if (error.response && error.response.status === 401) {
        logger.info("Received 401 error, attempting to refresh token");
        const newToken = await refreshAuthToken();

        if (newToken) {
          logger.info("Using new token for API request");
          token = newToken;

          // Повторяем запрос с новым токеном
          response = await axios.get(`${AUTH_SERVICE_URL}/users/${userId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } else {
          // Если не удалось обновить токен, пробрасываем ошибку дальше
          throw error;
        }
      } else {
        // Если ошибка не связана с авторизацией, пробрасываем ее дальше
        throw error;
      }
    }

    if (response.data) {
      // Сохраняем в кеш
      userCache.set(userId, {
        ...response.data,
        lastUpdated: now,
      });
      return response.data;
    }

    return null;
  } catch (error) {
    logger.error(`Failed to fetch user data: ${error.message}`);
    if (error.response) {
      logger.error(`Response status: ${error.response.status}`);
      logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
};

// Получение Ethereum адреса пользователя
const getUserEthereumAddress = async (userId) => {
  try {
    // Если userId равен 0 или null, возвращаем нулевой адрес (это склад)
    if (userId === 0 || userId === "0" || userId === null) {
      logger.info(`Converting warehouse/null holder ID to zero address`);
      return "0x0000000000000000000000000000000000000000";
    }

    const userData = await getUserById(userId);

    if (userData && userData.eth_address) {
      logger.info(
        `Found Ethereum address for user ${userId}: ${userData.eth_address}`
      );
      return userData.eth_address;
    }

    logger.warn(
      `Ethereum address not found for user ${userId}, using fallback address`
    );
    return "0x1234567890AbcdEF1234567890aBcdef12345678"; // Адрес по умолчанию
  } catch (error) {
    logger.error(
      `Error getting Ethereum address for user ${userId}: ${error.message}`
    );
    logger.warn(`Using fallback Ethereum address for user ${userId}`);
    return "0x1234567890AbcdEF1234567890aBcdef12345678";
  }
};

module.exports = {
  getUserById,
  getUserEthereumAddress,
  refreshAuthToken,
};
