import prisma from "../config/prisma.js";
import Loans from "../constants/loans.js";
import Cards from "../constants/cards.js";
import {calculateNextPaymentDate, calculateMonthlyInterest } from "../utils/loanUtils.js";

const DEFAULT_INTEREST_RATE = 15.0;
const PENALTY_RATE = 0.35;

async function checkAndApplyPenalties(loan, dbClient = prisma) {
    if (!loan || (loan.status !== Loans.active && loan.status !== Loans.unpaid) || !loan.monthly_payment_amount) {
        return loan;
    }

    const now = new Date();
    let updatedLoanData = {};
    let needsUpdate = false;

    if (loan.status === Loans.active && loan.next_payment_due_date && now > new Date(loan.next_payment_due_date)) {
        updatedLoanData.status = Loans.unpaid;

        const initialPenalty = parseFloat((loan.monthly_payment_amount * PENALTY_RATE).toFixed(2));
        updatedLoanData.accrued_penalty = parseFloat(((loan.accrued_penalty || 0) + initialPenalty).toFixed(2));
        updatedLoanData.last_penalty_calculation_date = now;
        needsUpdate = true;
        console.log(`Loan #${loan.id} became unpaid. Initial penalty: ${initialPenalty}`);
    }

    else if (loan.status === Loans.unpaid && loan.last_penalty_calculation_date) {
        const lastCalcDate = new Date(loan.last_penalty_calculation_date);
        const oneWeekInMilliseconds = 7 * 24 * 60 * 60 * 1000;

        let weeksOverdue = 0;
        let nextPenaltyDate = new Date(lastCalcDate.getTime() + oneWeekInMilliseconds);

        while(now >= nextPenaltyDate) {
            weeksOverdue++;
            nextPenaltyDate = new Date(nextPenaltyDate.getTime() + oneWeekInMilliseconds);
        }

        if (weeksOverdue > 0) {
            const weeklyPenalty = parseFloat((loan.monthly_payment_amount * PENALTY_RATE).toFixed(2));
            const totalNewPenalty = parseFloat((weeklyPenalty * weeksOverdue).toFixed(2));
            updatedLoanData.accrued_penalty = parseFloat(((loan.accrued_penalty || 0) + totalNewPenalty).toFixed(2));
            const timeDiff = now.getTime() - lastCalcDate.getTime();
            if (timeDiff >= oneWeekInMilliseconds) {
                updatedLoanData.last_penalty_calculation_date = now;
                needsUpdate = true;
                console.log(`Loan #${loan.id} is unpaid. Accrued ${weeksOverdue} weekly penalties. Total new: ${totalNewPenalty}`);
            }
        }
    }

    if (needsUpdate) {
        try {
            const changedLoan = await dbClient.loans.update({
                where: { id: loan.id },
                data: updatedLoanData,
            });
            return { ...loan, ...changedLoan };
        } catch (error) {
            console.error(`Error updating penalties for loan #${loan.id}:`, error);
            return loan;
        }
    }
    return loan;
}

export const applyForLoan = async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ error: "Користувач не авторизований для цієї дії." });
    }
    const { amount, termInMonths } = req.body;

    const loanAmountInput = parseFloat(amount);
    const loanAmount = parseFloat(loanAmountInput.toFixed(2));
    const loanTerm = parseInt(termInMonths, 10);

    if (isNaN(loanAmount) || loanAmount <= 0) return res.status(400).json({ error: "Сума кредиту повинна бути позитивним числом." });
    if (isNaN(loanTerm) || loanTerm <= 0) return res.status(400).json({ error: "Термін кредиту (в місяцях) повинен бути позитивним числом." });
    if (loanAmount > 1000000) return res.status(400).json({ error: "Максимальна сума кредиту 1,000,000 UAH." });
    if (loanTerm > 120) return res.status(400).json({ error: "Максимальний термін кредиту 120 місяців." });

    try {
        const unpaidLoans = await prisma.loans.findFirst({
            where: {
                user_id: userId,
                status: Loans.unpaid
            }
        });
        if (unpaidLoans) {
            return res.status(400).json({ error: `Ви не можете подати нову заявку, оскільки у вас є кредит зі статусом "Прострочено". Будь ласка, спочатку врегулюйте заборгованість.` });
        }

        const existingLoan = await prisma.loans.findFirst({
            where: { user_id: userId, status: { in: [Loans.waiting, Loans.active] } }
        });
        if (existingLoan) {
            return res.status(400).json({ error: `У вас вже є кредит зі статусом "${existingLoan.status}". Нова заявка неможлива.` });
        }
        const newLoanApplication = await prisma.loans.create({
            data: {
                user_id: userId, amount: loanAmount, interest_rate: DEFAULT_INTEREST_RATE,
                term: loanTerm, status: Loans.waiting,
                accrued_penalty: 0,
            },
        });
        res.status(201).json({
            message: "Заявку на кредит успішно подано та прийнято на розгляд.",
            loanApplication: {
                id: newLoanApplication.id, amount: newLoanApplication.amount, term: newLoanApplication.term,
                status: newLoanApplication.status, interest_rate: newLoanApplication.interest_rate
            },
        });
    } catch (error) {
        console.error("Помилка при поданні заявки на кредит:", error);
        res.status(500).json({ error: "Внутрішня помилка сервера при обробці заявки." });
    }
};

export const getUserLoans = async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ error: "Користувач не авторизований." });
    }
    try {
        const userLoans = await prisma.loans.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            include: {
                LoanPayments: { orderBy: { payment_date: 'desc' } }
            }
        });

        const updatedUserLoans = [];
        for (const loan of userLoans) {
            const checkedLoan = await checkAndApplyPenalties(loan);
            updatedUserLoans.push(checkedLoan);
        }

        const formattedLoans = updatedUserLoans.map(loan => ({
            ...loan,
            amount: parseFloat(loan.amount.toFixed(2)),
            interest_rate: parseFloat(loan.interest_rate.toFixed(2)),
            monthly_payment_amount: loan.monthly_payment_amount ? parseFloat(loan.monthly_payment_amount.toFixed(2)) : null,
            outstanding_principal: loan.outstanding_principal ? parseFloat(loan.outstanding_principal.toFixed(2)) : null,
            paid_amount: loan.paid_amount ? parseFloat(loan.paid_amount.toFixed(2)) : null,
            accrued_penalty: loan.accrued_penalty ? parseFloat(loan.accrued_penalty.toFixed(2)) : 0,
            LoanPayments: loan.LoanPayments.map(payment => ({

                ...payment,
                amount_paid: parseFloat(payment.amount_paid.toFixed(2)),
                principal_paid: parseFloat(payment.principal_paid.toFixed(2)),
                interest_paid: parseFloat(payment.interest_paid.toFixed(2)),
                outstanding_principal_after_payment: parseFloat(payment.outstanding_principal_after_payment.toFixed(2)),
            }))
        }));
        res.status(200).json(formattedLoans);
    } catch (error) {
        console.error("Помилка отримання кредитів користувача:", error);
        res.status(500).json({ error: "Помилка сервера при отриманні кредитів." });
    }
};

export const makeLoanPayment = async (req, res) => {
    const userId = req.userId;
    const { loanId } = req.params;
    const { paymentAmount } = req.body;

    if (!userId) return res.status(401).json({ error: "Користувач не авторизований." });
    if (!loanId) return res.status(400).json({ error: "ID кредиту не вказано." });

    const amountToPayByClient = parseFloat(paymentAmount);
    if (isNaN(amountToPayByClient) || amountToPayByClient <= 0) {
        return res.status(400).json({ error: "Сума платежу повинна бути позитивним числом." });
    }

    const roundedAmountToPayByClient = parseFloat(amountToPayByClient.toFixed(2));

    try {
        const result = await prisma.$transaction(async (tx) => {
            const loan = await tx.loans.findUnique({
                where: { id: parseInt(loanId) }
            });

            if (!loan) throw { status: 404, message: "Кредит не знайдено." };
            if (loan.user_id !== userId) throw { status: 403, message: "Цей кредит не належить вам." };
            if (loan.status !== Loans.active) {
                throw { status: 400, message: `Платежі можливі тільки по активних кредитах. Поточний статус: ${loan.status}` };
            }
            if (!loan.outstanding_principal || loan.outstanding_principal <= 0) {
                throw { status: 400, message: "Кредит вже погашено або має нульовий залишок." };
            }

            const userCard = await tx.cards.findFirst({
                where: { holder_id: userId, status: Cards.active }
            });
            if (!userCard) throw { status: 404, message: "Активну картку для списання коштів не знайдено." };

            if (userCard.status === Cards.expired) {
                throw { status: 403, message: "Платіж неможливий: термін дії вашої картки закінчився." };
            }
            if (userCard.status === Cards.blocked) {
                throw { status: 403, message: "Платіж неможливий: ваша картка заблокована." };
            }
            if (userCard.status !== Cards.active) {
                throw { status: 403, message: `Платіж неможливий: ваша картка не активна (статус: ${userCard.status}).` };
            }

            const currentInterestForPeriod = calculateMonthlyInterest(loan.outstanding_principal, loan.interest_rate);
            const actualAmountToCloseLoanIfThisIsLastPayment = parseFloat((loan.outstanding_principal + currentInterestForPeriod).toFixed(2));

            let effectivePaymentAmount = roundedAmountToPayByClient;
            if (roundedAmountToPayByClient > actualAmountToCloseLoanIfThisIsLastPayment && actualAmountToCloseLoanIfThisIsLastPayment > 0 && loan.outstanding_principal > 0) {
                effectivePaymentAmount = actualAmountToCloseLoanIfThisIsLastPayment;
            }
            if (userCard.balance < effectivePaymentAmount) throw { status: 400, message: `Недостатньо коштів на балансі картки. Потрібно: ${effectivePaymentAmount.toFixed(2)} UAH` };

            let interestPaidThisPeriod = 0;
            let principalPaidThisPeriod = 0;

            if (effectivePaymentAmount >= currentInterestForPeriod) {
                interestPaidThisPeriod = currentInterestForPeriod;
                principalPaidThisPeriod = parseFloat((effectivePaymentAmount - currentInterestForPeriod).toFixed(2));
            } else {
                interestPaidThisPeriod = effectivePaymentAmount; principalPaidThisPeriod = 0;
            }
            if (principalPaidThisPeriod > loan.outstanding_principal) principalPaidThisPeriod = parseFloat(loan.outstanding_principal.toFixed(2));
            if ((principalPaidThisPeriod + interestPaidThisPeriod) > effectivePaymentAmount && effectivePaymentAmount >= principalPaidThisPeriod) {
                interestPaidThisPeriod = parseFloat((effectivePaymentAmount - principalPaidThisPeriod).toFixed(2));
                if (interestPaidThisPeriod < 0) interestPaidThisPeriod = 0;
            } else if ((principalPaidThisPeriod + interestPaidThisPeriod) < effectivePaymentAmount && principalPaidThisPeriod === parseFloat(loan.outstanding_principal.toFixed(2))) {
                interestPaidThisPeriod = parseFloat((effectivePaymentAmount - principalPaidThisPeriod).toFixed(2));
                if (interestPaidThisPeriod < 0) interestPaidThisPeriod = 0;
            }
            const newCardBalance = parseFloat((userCard.balance - effectivePaymentAmount).toFixed(2));
            await tx.cards.update({ where: { id: userCard.id }, data: { balance: newCardBalance } });
            const newOutstandingPrincipal = Math.max(0, parseFloat((loan.outstanding_principal - principalPaidThisPeriod).toFixed(2)));
            const newPaidAmountTotal = parseFloat(((loan.paid_amount || 0) + effectivePaymentAmount).toFixed(2));
            const updatedLoan = await tx.loans.update({
                where: { id: loan.id },
                data: {
                    outstanding_principal: newOutstandingPrincipal, paid_amount: newPaidAmountTotal,
                    last_payment_date: new Date(),
                    next_payment_due_date: newOutstandingPrincipal > 0.001 ? calculateNextPaymentDate(loan.next_payment_due_date || new Date()) : null,
                    status: newOutstandingPrincipal <= 0.001 ? Loans.closed : loan.status,
                }
            });
            await tx.loanPayment.create({
                data: {
                    loan_id: loan.id, amount_paid: effectivePaymentAmount, principal_paid: principalPaidThisPeriod,
                    interest_paid: interestPaidThisPeriod, outstanding_principal_after_payment: newOutstandingPrincipal,
                    notes: `Платіж по кредиту. Запит клієнта: ${roundedAmountToPayByClient.toFixed(2)} UAH`
                }
            });
            return updatedLoan;
        });

        res.status(200).json({ message: "Платіж по кредиту успішно здійснено.", loan: result });

    } catch (error) {
        console.error("Помилка при здійсненні платежу по кредиту:", error);
        if (error.status && error.message) {
            return res.status(error.status).json({ error: error.message });
        }
        res.status(500).json({ error: "Внутрішня помилка сервера." });
    }
};

export const payLoanPenalty = async (req, res) => {
    const userId = req.userId;
    const { loanId } = req.params;

    if (!userId) return res.status(401).json({ error: "Користувач не авторизований." });
    if (!loanId) return res.status(400).json({ error: "ID кредиту не вказано." });

    try {
        const result = await prisma.$transaction(async (tx) => {
            let loan = await tx.loans.findUnique({ where: { id: parseInt(loanId) } });

            if (!loan) throw { status: 404, message: "Кредит не знайдено." };
            if (loan.user_id !== userId) throw { status: 403, message: "Цей кредит не належить вам." };

            loan = await checkAndApplyPenalties(loan, tx);

            if (loan.status !== Loans.unpaid) {
                throw { status: 400, message: `Кредит не є простроченим або немає штрафів до сплати. Статус: ${loan.status}` };
            }
            if (!loan.accrued_penalty || loan.accrued_penalty <= 0) {
                throw { status: 400, message: "Нарахованих штрафів до сплати немає." };
            }

            const penaltyToPay = parseFloat(loan.accrued_penalty.toFixed(2));

            const userCard = await tx.cards.findFirst({
                where: { holder_id: userId, status: Cards.active }
            });
            if (!userCard) throw { status: 404, message: "Активну картку для списання коштів не знайдено." };

            if (userCard.status === Cards.expired) {
                throw { status: 403, message: "Сплата штрафу неможлива: термін дії вашої картки закінчився." };
            }
            if (userCard.status === Cards.blocked) {
                throw { status: 403, message: "Сплата штрафу неможлива: ваша картка заблокована." };
            }
            if (userCard.status !== Cards.active) { // Загальна перевірка
                throw { status: 403, message: `Сплата штрафу неможлива: ваша картка не активна (статус: ${userCard.status}).` };
            }

            if (userCard.balance < penaltyToPay) throw { status: 400, message: `Недостатньо коштів на картці для сплати штрафу. Потрібно: ${penaltyToPay} UAH` };

            const newCardBalance = parseFloat((userCard.balance - penaltyToPay).toFixed(2));
            await tx.cards.update({
                where: { id: userCard.id },
                data: { balance: newCardBalance }
            });

            const paymentDate = new Date();
            let nextDueDate = new Date(paymentDate);
            nextDueDate.setDate(nextDueDate.getDate() + 3);

            const updatedLoan = await tx.loans.update({
                where: { id: loan.id },
                data: {
                    accrued_penalty: 0,
                    status: Loans.active,
                    next_payment_due_date: nextDueDate,
                    last_penalty_calculation_date: null,
                    last_payment_date: paymentDate,
                }
            });

            await tx.loanPayment.create({
                data: {
                    loan_id: loan.id,
                    payment_date: paymentDate,
                    amount_paid: penaltyToPay,
                    principal_paid: 0,
                    interest_paid: 0,
                    outstanding_principal_after_payment: loan.outstanding_principal,
                    notes: `Сплата штрафу у розмірі ${penaltyToPay.toFixed(2)} UAH.`
                }
            });

            return updatedLoan;
        });
        res.status(200).json({ message: "Штраф по кредиту успішно сплачено. Кредит знову активний.", loan: result });

    } catch (error) {
        console.error("Помилка при сплаті штрафу по кредиту:", error);
        if (error.status && error.message) {
            return res.status(error.status).json({ error: error.message });
        }
        res.status(500).json({ error: "Внутрішня помилка сервера при сплаті штрафу." });
    }
};

export const deleteUserLoan = async (req, res) => {
    const userId = req.userId;
    const { loanId } = req.params;

    if (!userId) {
        return res.status(401).json({ error: "Користувач не авторизований." });
    }
    if (!loanId) {
        return res.status(400).json({ error: "ID кредиту не вказано." });
    }

    try {
        const loan = await prisma.loans.findUnique({
            where: { id: parseInt(loanId) }
        });

        if (!loan) {
            return res.status(404).json({ error: "Кредит не знайдено." });
        }

        if (loan.user_id !== userId) {
            return res.status(403).json({ error: "Ви не можете видалити цей кредит, оскільки він не належить вам." });
        }

        if (loan.status !== Loans.closed && loan.status !== Loans.rejected) {
            return res.status(400).json({ error: `Можна видаляти лише погашені або відхилені кредити. Поточний статус: "${loan.status}".` });
        }

        await prisma.loans.delete({
            where: { id: parseInt(loanId) }
        });

        res.status(200).json({ message: `Історію кредиту #${loanId} та пов'язані платежі успішно видалено.` });

    } catch (error) {
        console.error(`Помилка при видаленні кредиту #${loanId}:`, error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: "Кредит для видалення не знайдено. Можливо, його вже було видалено." });
        }
        res.status(500).json({ error: "Внутрішня помилка сервера при видаленні кредиту." });
    }
};