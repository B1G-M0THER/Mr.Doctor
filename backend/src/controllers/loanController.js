import prisma from "../config/prisma.js";
import Loans from "../constants/loans.js";
import Cards from "../constants/cards.js";
import {calculateNextPaymentDate, calculateMonthlyInterest } from "../utils/loanUtils.js";


const DEFAULT_INTEREST_RATE = 15.0;

export const applyForLoan = async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ error: "Користувач не авторизований для цієї дії." });
    }
    const { amount, termInMonths } = req.body;
    const loanAmount = parseFloat(amount);
    const loanTerm = parseInt(termInMonths, 10);

    if (isNaN(loanAmount) || loanAmount <= 0) return res.status(400).json({ error: "Сума кредиту повинна бути позитивним числом." });
    if (isNaN(loanTerm) || loanTerm <= 0) return res.status(400).json({ error: "Термін кредиту (в місяцях) повинен бути позитивним числом." });
    if (loanAmount > 1000000) return res.status(400).json({ error: "Максимальна сума кредиту 1,000,000 UAH." });
    if (loanTerm > 120) return res.status(400).json({ error: "Максимальний термін кредиту 120 місяців." });

    try {
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
        res.status(200).json(userLoans);
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

    const amountToPay = parseFloat(paymentAmount);
    if (isNaN(amountToPay) || amountToPay <= 0) {
        return res.status(400).json({ error: "Сума платежу повинна бути позитивним числом." });
    }

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
            if (userCard.balance < amountToPay) throw { status: 400, message: "Недостатньо коштів на балансі картки для здійснення платежу." };

            const monthlyInterest = calculateMonthlyInterest(loan.outstanding_principal, loan.interest_rate);
            let interestPaidThisMonth = 0;
            let principalPaidThisMonth = 0;

            if (amountToPay >= monthlyInterest) {
                interestPaidThisMonth = monthlyInterest;
                principalPaidThisMonth = amountToPay - monthlyInterest;
            } else {
                interestPaidThisMonth = amountToPay;
                principalPaidThisMonth = 0;
            }

            if (principalPaidThisMonth > loan.outstanding_principal) {
                principalPaidThisMonth = loan.outstanding_principal;
            }

            // 1. Списання коштів з картки
            await tx.cards.update({
                where: { id: userCard.id },
                data: { balance: { decrement: amountToPay } }
            });

            // 3. Оновлення даних кредиту
            const newOutstandingPrincipal = Math.max(0, parseFloat((loan.outstanding_principal - principalPaidThisMonth).toFixed(2))); // Додано toFixed для точності
            const newPaidAmount = parseFloat(((loan.paid_amount || 0) + amountToPay).toFixed(2)); // Додано toFixed

            const updatedLoan = await tx.loans.update({
                where: { id: loan.id },
                data: {
                    outstanding_principal: newOutstandingPrincipal,
                    paid_amount: newPaidAmount,
                    last_payment_date: new Date(),
                    next_payment_due_date: newOutstandingPrincipal > 0 ? calculateNextPaymentDate(loan.next_payment_due_date || new Date()) : null,
                    status: newOutstandingPrincipal <= 0.001 ? Loans.closed : loan.status, // Порівняння з невеликим епсилон для чисел з плаваючою комою
                }
            });

            // 4. Створення запису в історії платежів по кредиту
            await tx.loanPayment.create({
                data: {
                    loan_id: loan.id,
                    amount_paid: amountToPay,
                    principal_paid: principalPaidThisMonth,
                    interest_paid: interestPaidThisMonth,
                    outstanding_principal_after_payment: newOutstandingPrincipal,
                    notes: "Платіж по кредиту" // Можна додати "Щомісячний платіж" або "Часткове дострокове погашення" і т.д.
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