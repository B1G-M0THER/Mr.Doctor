// backend/src/controllers/loanController.js
import prisma from "../config/prisma.js";
import Loans from "../constants/loans.js";

const DEFAULT_INTEREST_RATE = 15.0;

export const applyForLoan = async (req, res) => {
    const userId = req.userId;

    if (!userId) {
        return res.status(401).json({ error: "Користувач не авторизований для цієї дії." });
    }

    const { amount, termInMonths } = req.body;

    const loanAmount = parseFloat(amount);
    const loanTerm = parseInt(termInMonths, 10);

    if (isNaN(loanAmount) || loanAmount <= 0) {
        return res.status(400).json({ error: "Сума кредиту повинна бути позитивним числом." });
    }
    if (isNaN(loanTerm) || loanTerm <= 0) {
        return res.status(400).json({ error: "Термін кредиту (в місяцях) повинен бути позитивним числом." });
    }
    if (loanAmount > 1000000) {
        return res.status(400).json({ error: "Максимальна сума кредиту 1,000,000 UAH." });
    }
    if (loanTerm > 120) {
        return res.status(400).json({ error: "Максимальний термін кредиту 120 місяців." });
    }

    try {
        const existingLoan = await prisma.loans.findFirst({
            where: {
                user_id: userId,
                status: { in: [Loans.waiting, Loans.active] }
            }
        });

        if (existingLoan) {
            return res.status(400).json({ error: `У вас вже є кредит зі статусом "${existingLoan.status}". Нова заявка неможлива.` });
        }

        const newLoanApplication = await prisma.loans.create({
            data: {
                user_id: userId,
                amount: loanAmount,
                interest_rate: DEFAULT_INTEREST_RATE,
                term: loanTerm,
                status: Loans.waiting,
            },
        });

        res.status(201).json({
            message: "Заявку на кредит успішно подано та прийнято на розгляд.",
            loanApplication: {
                id: newLoanApplication.id,
                amount: newLoanApplication.amount,
                term: newLoanApplication.term,
                status: newLoanApplication.status,
                interest_rate: newLoanApplication.interest_rate
            },
        });

    } catch (error) {
        console.error("Помилка при поданні заявки на кредит:", error);
        res.status(500).json({ error: "Внутрішня помилка сервера при обробці заявки." });
    }
};