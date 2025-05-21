/**
 * Общие вспомогательные функции
 */

// Получить значение из переменной окружения или использовать значение по умолчанию
exports.getEnv = (key, defaultValue) => {
  return process.env[key] || defaultValue;
};

// Безопасный парсинг целого числа
exports.parseInt = (value, defaultValue = 0) => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Форматирование даты для отображения
exports.formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString();
};

// Генерация случайного идентификатора
exports.generateId = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
