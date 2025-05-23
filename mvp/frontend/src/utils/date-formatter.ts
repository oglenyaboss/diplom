/**
 * Форматирование даты в удобочитаемый формат
 * @param dateString строка даты в формате ISO
 * @returns отформатированная строка даты
 */
export function formatDate(dateString: string): string {
  if (!dateString) return "Не указано";

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString || "Не указано";
  }
}
