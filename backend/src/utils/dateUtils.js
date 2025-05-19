
/**
 * Перетворює рядок "MM/YYYY" на об'єкт Date.
 * Встановлює день на перший день наступного місяця для порівняння.
 * @param {string} dateString - Рядок у форматі "MM/YYYY".
 * @returns {Date|null} - Об'єкт Date або null, якщо рядок невалідний.
 */
export const parseDueDate = (dateString) => {
    if (!dateString || !/^\d{2}\/\d{4}$/.test(dateString)) {
        return null;
    }
    const parts = dateString.split('/');
    const month = parseInt(parts[0], 10);
    const year = parseInt(parts[1], 10);
    if (month < 1 || month > 12) {
        return null;
    }
    return new Date(year, month, 1);
};

/**
 * Генерує рядок дати "MM/YYYY" для майбутнього (наприклад, +N років).
 * @param {number} yearsToAdd - Кількість років, яку потрібно додати.
 * @returns {string} - Рядок дати у форматі "MM/YYYY".
 */
export const generateFutureDueDateString = (yearsToAdd) => {
    const date = new Date();
    const currentMonth = date.getMonth() + 1;
    const currentYear = date.getFullYear() + yearsToAdd;
    return `${String(currentMonth).padStart(2, '0')}/${currentYear}`;
};