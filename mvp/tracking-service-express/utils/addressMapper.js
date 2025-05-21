// Карта для конвертации ID пользователей в Ethereum адреса
// В реальном приложении это было бы в базе данных или загружалось динамически
const userAddressMap = {
  1: "0x1234567890AbcdEF1234567890aBcdef12345678",
  2: "0xabcdef1234567890abcdef1234567890abcdef12",
  default: "0x1234567890AbcdEF1234567890aBcdef12345678",
};

// Функция для преобразования ID пользователя в Ethereum адрес
const getUserEthereumAddress = (userId) => {
  if (userAddressMap[userId]) {
    return userAddressMap[userId];
  }

  // Если ID нет в карте, используем адрес по умолчанию
  logger.warn(
    `ID пользователя ${userId} не найден в карте адресов, используем адрес по умолчанию`
  );
  return userAddressMap.default;
};
