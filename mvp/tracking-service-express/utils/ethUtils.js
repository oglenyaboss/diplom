/**
 * Вспомогательные функции для работы с Ethereum
 */

// Преобразование ID пользователя в Ethereum адрес
exports.userIdToAddress = (userId) => {
  if (!userId) return "0x0000000000000000000000000000000000000000";

  // Простое преобразование ID в адрес Ethereum
  // В реальном приложении здесь может быть более сложная логика
  return "0x" + userId.toString().padStart(40, "0");
};

// Преобразование временной метки Unix в JavaScript Date
exports.timestampToDate = (timestamp) => {
  return new Date(timestamp * 1000);
};

// Преобразование JavaScript Date в временную метку Unix
exports.dateToTimestamp = (date) => {
  return Math.floor(date.getTime() / 1000);
};

// Сокращение Ethereum адреса для отображения
exports.shortenAddress = (address) => {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(
    address.length - 4
  )}`;
};
