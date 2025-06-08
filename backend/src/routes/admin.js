import express from "express";
import prisma from "../config/prisma.js";
import jwt from "jsonwebtoken";
import Cards from "../constants/cards.js";
import Loans from "../constants/loans.js";
import Deposits from "../constants/deposits.js";
import { calculateEMI, calculateNextPaymentDate } from "../utils/loanUtils.js";

const router = express.Router();

router.get("/cards", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Неавторизований доступ." });
    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const admin = await prisma.users.findUnique({ where: { id: decoded.id } });
        if (!admin || admin.role !== "ADMIN") return res.status(403).json({ error: "Доступ заборонено." });

        const waitingCards = await prisma.cards.findMany({
            where: { status: Cards.waiting },
            include: { Users: { select: { name: true, email: true, id: true, } } },
        });
        const formattedCards = waitingCards.map(card => ({
            id: card.id, card_number: card.card_number, status: card.status,
            holder_name: card.Users.name, holder_email: card.Users.email, holder_id: card.Users.id,
            balance: card.balance, dueDate: card.dueDate,
        }));
        res.status(200).json(formattedCards);
    } catch (error) {
        console.error("Помилка отримання карток:", error);
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ error: "Недійсний або прострочений токен." });
        }
        res.status(500).json({ error: "Помилка сервера." });
    }
});

router.post("/cards/confirm", async (req, res) => {
    const { card_id, action } = req.body;
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Неавторизований доступ." });
    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const admin = await prisma.users.findUnique({ where: { id: decoded.id } });
        if (!admin || admin.role !== "ADMIN") return res.status(403).json({ error: "Доступ заборонено." });

        const cardToProcess = await prisma.cards.findUnique({ where: { id: card_id } });
        if (!cardToProcess) return res.status(404).json({ error: "Картку не знайдено." });
        if (cardToProcess.status !== Cards.waiting) {
            return res.status(400).json({ error: `Дія неможлива. Картка не в статусі 'waiting', поточний статус: ${cardToProcess.status}` });
        }

        if (action === "confirm") {
            const currentDate = new Date();
            const dueDate = `${String(currentDate.getMonth() + 1).padStart(2, "0")}/${currentDate.getFullYear() + 10}`;
            const updatedCard = await prisma.cards.update({
                where: { id: card_id },
                data: { status: Cards.active, dueDate },
            });

            if (updatedCard.Users && updatedCard.Users.role === "NONE") {
                await prisma.users.update({
                    where: { id: updatedCard.holder_id }, data: { role: "CLIENT" },
                });
            } else {
                await prisma.users.update({
                    where: { id: updatedCard.holder_id }, data: { role: "CLIENT" },
                });
            }
            return res.status(200).json({ message: "Картка підтверджена." });
        } else if (action === "reject") {
            await prisma.cards.delete({ where: { id: card_id } });
            return res.status(200).json({ message: "Картка відхилена та видалена." });
        } else {
            return res.status(400).json({ error: "Невідома дія." });
        }
    } catch (error) {
        console.error("Помилка підтвердження/відхилення картки:", error);
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ error: "Недійсний або прострочений токен." });
        }
        res.status(500).json({ error: "Помилка сервера." });
    }
});

router.get("/cards/renewal-requests", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Неавторизований доступ." });
    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const admin = await prisma.users.findUnique({ where: { id: decoded.id } });
        if (!admin || admin.role !== "ADMIN") return res.status(403).json({ error: "Доступ заборонено." });
        const renewalRequests = await prisma.cards.findMany({
            where: { status: Cards.renewal_pending },
            include: { Users: { select: { name: true, id: true, email: true } } },
        });
        const formattedRequests = renewalRequests.map(card => ({
            id: card.id, card_number: card.card_number, status: card.status,
            holder_name: card.Users.name, holder_email: card.Users.email, holder_id: card.Users.id,
            balance: card.balance, dueDate: card.dueDate,
        }));
        res.status(200).json(formattedRequests);
    } catch (error) {
        console.error("Помилка отримання запитів на поновлення карток:", error);
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ error: "Недійсний або прострочений токен." });
        }
        res.status(500).json({ error: "Помилка сервера." });
    }
});

router.post("/cards/approve-renewal/:cardId", async (req, res) => {
    const { cardId } = req.params;
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Неавторизований доступ." });
    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const admin = await prisma.users.findUnique({ where: { id: decoded.id } });
        if (!admin || admin.role !== "ADMIN") return res.status(403).json({ error: "Доступ заборонено." });
        const cardToApprove = await prisma.cards.findUnique({ where: { id: parseInt(cardId) } });
        if (!cardToApprove) return res.status(404).json({ error: "Картку для підтвердження поновлення не знайдено." });
        if (cardToApprove.status !== Cards.renewal_pending) return res.status(400).json({ error: `Ця картка не очікує підтвердження поновлення. Поточний статус: ${cardToApprove.status}` });
        const approvedCard = await prisma.cards.update({
            where: { id: parseInt(cardId) }, data: { status: Cards.active }
        });
        res.status(200).json({ message: "Поновлення картки успішно підтверджено.", card: approvedCard });
    } catch (error) {
        console.error("Помилка підтвердження поновлення картки:", error);
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ error: "Недійсний або прострочений токен." });
        }
        res.status(500).json({ error: "Помилка сервера." });
    }
});

router.get("/loans/pending", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Неавторизований доступ." });
    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const admin = await prisma.users.findUnique({ where: { id: decoded.id } });
        if (!admin || admin.role !== "ADMIN") return res.status(403).json({ error: "Доступ заборонено." });

        const pendingLoans = await prisma.loans.findMany({
            where: { status: Loans.waiting },
            include: { Users: { select: { id: true, name: true, email: true } } },
            orderBy: { created_at: 'asc' }
        });
        const formattedLoans = pendingLoans.map(loan => ({
            ...loan,
            created_at_formatted: new Date(loan.created_at).toLocaleDateString('uk-UA') + " " + new Date(loan.created_at).toLocaleTimeString('uk-UA'),
            amount: parseFloat(loan.amount),
            interest_rate: parseFloat(loan.interest_rate.toFixed(2))
        }));
        res.status(200).json(formattedLoans);
    } catch (error) {
        console.error("Помилка отримання заявок на кредит:", error);
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ error: "Недійсний або прострочений токен." });
        }
        res.status(500).json({ error: "Помилка сервера при отриманні заявок." });
    }
});

router.post("/loans/decide/:loanId", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Неавторизований доступ." });

    const { loanId } = req.params;
    const { decision } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const adminUser = await prisma.users.findUnique({ where: { id: decoded.id } });
        if (!adminUser || adminUser.role !== "ADMIN") return res.status(403).json({ error: "Доступ заборонено." });

        const loan = await prisma.loans.findUnique({ where: { id: parseInt(loanId) } });
        if (!loan) return res.status(404).json({ error: "Заявку на кредит не знайдено." });
        if (loan.status !== Loans.waiting) return res.status(400).json({ error: `Неможливо змінити статус. Поточний статус: ${loan.status}` });

        let updatedLoanData = {};
        const now = new Date();
        const loanAmount = parseFloat(loan.amount);
        const interestRate = parseFloat(loan.interest_rate.toFixed(2));
        const termInMonths = loan.term;

        if (decision === 'approve') {
            const emi = calculateEMI(loanAmount, interestRate, termInMonths);

            updatedLoanData = {
                status: Loans.active,
                monthly_payment_amount: emi,
                outstanding_principal: loanAmount,
                next_payment_due_date: calculateNextPaymentDate(now),
                activated_at: now,
                paid_amount: 0,
            };
        } else if (decision === 'reject') {
            updatedLoanData = { status: Loans.rejected };
        } else {
            return res.status(400).json({ error: "Невірна дія. Можливі значення: 'approve', 'reject'." });
        }

        if (decision === 'approve') {
            const result = await prisma.$transaction(async (tx) => {
                const approvedLoan = await tx.loans.update({
                    where: { id: parseInt(loanId) },
                    data: updatedLoanData,
                });

                const userActiveCard = await tx.cards.findFirst({
                    where: { holder_id: approvedLoan.user_id, status: Cards.active }
                });

                if (!userActiveCard) {
                    throw new Error(`Неможливо видати кредит: у користувача (ID: ${approvedLoan.user_id}) немає активної картки.`);
                }

                const currentCardBalance = parseFloat(userActiveCard.balance);
                const loanAmountNum = parseFloat(loan.amount);

                const newCardBalance = currentCardBalance + loanAmountNum;

                await tx.cards.update({
                    where: { id: userActiveCard.id },
                    data: { balance: newCardBalance }
                });

                return approvedLoan;
            });
            return res.status(200).json({ message: "Кредит схвалено на початкових умовах, кошти зараховано.", loan: result });
        } else {
            const rejectedLoan = await prisma.loans.update({
                where: { id: parseInt(loanId) },
                data: updatedLoanData,
            });
            return res.status(200).json({ message: "Заявку на кредит відхилено.", loan: rejectedLoan });
        }
    } catch (error) {
        console.error("Помилка при обробці заявки на кредит:", error);
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ error: "Недійсний або прострочений токен." });
        }
        if (error.message && error.message.startsWith("Неможливо видати кредит:")) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Внутрішня помилка сервера." });
    }
});

router.get("/deposits/pending", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Неавторизований доступ." });
    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const admin = await prisma.users.findUnique({ where: { id: decoded.id } });
        if (!admin || admin.role !== "ADMIN") return res.status(403).json({ error: "Доступ заборонено." });

        const pendingDeposits = await prisma.deposits.findMany({
            where: { status: Deposits.waiting_approval },
            include: { Users: { select: { id: true, name: true, email: true } } },
            orderBy: { created_at: 'asc' }
        });
        res.status(200).json(pendingDeposits);
    } catch (error) {
        console.error("Помилка отримання заявок на депозит:", error);
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ error: "Недійсний або прострочений токен." });
        }
        res.status(500).json({ error: "Помилка сервера при отриманні заявок на депозит." });
    }
});

router.post("/deposits/decide/:depositId", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Неавторизований доступ." });

    const { depositId } = req.params;
    const { decision } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const adminUser = await prisma.users.findUnique({ where: { id: decoded.id } });
        if (!adminUser || adminUser.role !== "ADMIN") return res.status(403).json({ error: "Доступ заборонено." });

        const deposit = await prisma.deposits.findUnique({ where: { id: parseInt(depositId) } });
        if (!deposit) return res.status(404).json({ error: "Заявку на депозит не знайдено." });
        if (deposit.status !== Deposits.waiting_approval) {
            return res.status(400).json({ error: `Неможливо змінити статус. Поточний статус депозиту: ${deposit.status}` });
        }

        if (decision === 'approve') {
            const userCard = await prisma.cards.findFirst({
                where: { holder_id: deposit.user_id, status: Cards.active }
            });
            if (!userCard) {
                return res.status(400).json({ error: `Неможливо схвалити депозит: у користувача (ID: ${deposit.user_id}) немає активної картки.` });
            }
            if (userCard.balance < deposit.amount) {
                return res.status(400).json({ error: `Неможливо схвалити депозит: недостатньо коштів на картці користувача (ID: ${deposit.user_id}). Потрібно ${deposit.amount}, доступно ${userCard.balance.toFixed(2)}.` });
            }

            const approvalTime = new Date();
            let calculatedMaturityDate = new Date(approvalTime);
            calculatedMaturityDate.setMonth(calculatedMaturityDate.getMonth() + deposit.term);

            await prisma.$transaction(async (tx) => {
                await tx.cards.update({
                    where: { id: userCard.id },
                    data: { balance: { decrement: deposit.amount } }
                });
                const approvedDeposit = await tx.deposits.update({
                    where: { id: parseInt(depositId) },
                    data: {
                        status: Deposits.active,
                        approved_at: approvalTime,
                        maturity_date: calculatedMaturityDate,
                    },
                });
                return res.status(200).json({ message: "Депозит схвалено, кошти списано з картки користувача.", deposit: approvedDeposit });
            });
        } else if (decision === 'reject') {
            const rejectedDeposit = await prisma.deposits.update({
                where: { id: parseInt(depositId) },
                data: { status: Deposits.rejected },
            });
            return res.status(200).json({ message: "Заявку на депозит відхилено.", deposit: rejectedDeposit });
        } else {
            return res.status(400).json({ error: "Невірна дія. Можливі значення: 'approve', 'reject'." });
        }
    } catch (error) {
        console.error("Помилка при обробці заявки на депозит:", error);
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ error: "Недійсний або прострочений токен." });
        }
        res.status(500).json({ error: "Внутрішня помилка сервера." });
    }
});

export default router;