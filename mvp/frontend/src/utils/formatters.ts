/**
 * Форматирование даты в удобочитаемый формат
 * @param dateString строка даты в формате ISO
 * @param options дополнительные параметры форматирования
 * @returns отформатированная строка даты
 */
export function formatDate(
  dateString: string,
  options: {
    format?: "full" | "short" | "date-only";
    locale?: string;
  } = {}
): string {
  if (!dateString) return "Не указано";

  try {
    const date = new Date(dateString);
    const locale = options.locale || "ru-RU";

    switch (options.format) {
      case "short":
        return date.toLocaleDateString(locale, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      case "date-only":
        return date.toLocaleDateString(locale);
      case "full":
      default:
        return date.toLocaleDateString(locale, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
    }
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString || "Не указано";
  }
}

/**
 * Форматирование числа в денежный формат
 * @param value число для форматирования
 * @param options дополнительные параметры форматирования
 * @returns отформатированная строка с денежным значением
 */
export function formatCurrency(
  value: number,
  options: {
    currency?: string;
    locale?: string;
  } = {}
): string {
  try {
    const locale = options.locale || "ru-RU";
    const currency = options.currency || "RUB";

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch (error) {
    console.error("Error formatting currency:", error);
    return String(value);
  }
}

/**
 * Форматирование числа с разделителями разрядов
 * @param value число для форматирования
 * @param options дополнительные параметры форматирования
 * @returns отформатированная строка числа
 */
export function formatNumber(
  value: number,
  options: {
    locale?: string;
    decimals?: number;
  } = {}
): string {
  try {
    const locale = options.locale || "ru-RU";
    const decimals = options.decimals !== undefined ? options.decimals : 0;

    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch (error) {
    console.error("Error formatting number:", error);
    return String(value);
  }
}

/**
 * Сокращение длинного текста с добавлением многоточия
 * @param text исходный текст
 * @param maxLength максимальная длина текста
 * @returns сокращенный текст
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (!text) return "";

  if (text.length <= maxLength) return text;

  return `${text.substring(0, maxLength).trim()}...`;
}
