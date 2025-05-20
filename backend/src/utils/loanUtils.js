/**
 * Розраховує щомісячний ануїтетний платіж (EMI).
 * @param {number} principal - Сума кредиту (тіло кредиту).
 * @param {number} annualInterestRate - Річна відсоткова ставка (у відсотках, наприклад, 15 для 15%).
 * @param {number} termInMonths - Термін кредиту в місяцях.
 * @returns {number} - Розмір щомісячного платежу, округлений до 2 знаків після коми.
 */
export function calculateEMI(principal, annualInterestRate, termInMonths) {
    if (principal <= 0 || annualInterestRate < 0 || termInMonths <= 0) {
        return 0;
    }

    const monthlyInterestRate = (annualInterestRate / 100) / 12;

    if (monthlyInterestRate === 0) {
        return parseFloat((principal / termInMonths).toFixed(2));
    }

    const emi =
        principal *
        monthlyInterestRate *
        Math.pow(1 + monthlyInterestRate, termInMonths) /
        (Math.pow(1 + monthlyInterestRate, termInMonths) - 1);

    return parseFloat(emi.toFixed(2));
}

/**
 * Розраховує відсотки за один місяць на поточний залишок боргу.
 * @param {number} outstandingPrincipal - Поточний залишок основного боргу.
 * @param {number} annualInterestRate - Річна відсоткова ставка (у відсотках).
 * @returns {number} - Сума відсотків за місяць.
 */
export function calculateMonthlyInterest(outstandingPrincipal, annualInterestRate) {
    if (outstandingPrincipal <= 0 || annualInterestRate < 0) {
        return 0;
    }
    const monthlyInterestRate = (annualInterestRate / 100) / 12;
    return parseFloat((outstandingPrincipal * monthlyInterestRate).toFixed(2));
}

/**
 * Визначає дату наступного платежу (наприклад, через місяць від поточної/заданої дати).
 * @param {Date} [fromDate=new Date()] - Дата, від якої рахувати наступний платіж.
 * @returns {Date}
 */
export function calculateNextPaymentDate(fromDate = new Date()) {
    const nextDate = new Date(fromDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    return nextDate;
}