import express from "express";
import prisma from "../config/prisma.js";
import jwt from "jsonwebtoken";
import Cards from "../constants/cards.js";
import Loans from "../constants/loans.js";

const router = express.Router();

router.get("/cards", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Неавторизований доступ." });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);

        const admin = await prisma.users.findUnique({
            where: { id: decoded.id },
        });

        if (!admin || admin.role !== "ADMIN") {
            return res.status(403).json({ error: "Доступ заборонено." });
        }

        const waitingCards = await prisma.cards.findMany({
            where: { status: Cards.waiting },
            include: {
                Users: {
                    select: {
                        name: true,
                        email: true,
                        id: true,
                    }
                }},
        });

        const formattedCards = waitingCards.map(card => ({
            id: card.id,
            card_number: card.card_number,
            status: card.status,
            holder_name: card.Users.name,
            holder_email: card.Users.email,
            holder_id: card.Users.id,
            balance: card.balance,
            dueDate: card.dueDate,
        }));

        res.status(200).json(formattedCards);
    } catch (error) {
        console.error("Помилка отримання карток:", error);
        res.status(500).json({ error: "Помилка сервера." });
    }
});

router.post("/cards/confirm", async (req, res) => {
    const { card_id, action } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Неавторизований доступ." });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);

        const admin = await prisma.users.findUnique({
            where: { id: decoded.id },
        });

        if (!admin || admin.role !== "ADMIN") {
            return res.status(403).json({ error: "Доступ заборонено." });
        }

        if (action === "confirm") {
            const currentDate = new Date();
            const dueDate = `${String(currentDate.getMonth() + 1).padStart(2, "0")}/${currentDate.getFullYear() + 10}`;

            const updatedCard = await prisma.cards.update({
                where: { id: card_id },
                data: {
                    status: Cards.active,
                    dueDate,
                },
            });

            await prisma.users.update({
                where: { id: updatedCard.holder_id },
                data: { role: "CLIENT" },
            });

            return res.status(200).json({ message: "Картка підтверджена." });
        } else if (action === "reject") {
            await prisma.cards.delete({
                where: { id: card_id },
            });
            return res.status(200).json({ message: "Картка відхилена." });
        } else {
            return res.status(400).json({ error: "Невідома дія." });
        }
    } catch (error) {
        console.error("Помилка підтвердження/відхилення картки:", error);
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
            id: card.id,
            card_number: card.card_number,
            status: card.status,
            holder_name: card.Users.name,
            holder_email: card.Users.email,
            holder_id: card.Users.id,
            balance: card.balance,
            dueDate: card.dueDate,
        }));
        res.status(200).json(formattedRequests);
    } catch (error) {
        console.error("Помилка отримання запитів на поновлення карток:", error);
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

        const cardToApprove = await prisma.cards.findUnique({
            where: { id: parseInt(cardId) }
        });

        if (!cardToApprove) {
            return res.status(404).json({ error: "Картку для підтвердження поновлення не знайдено." });
        }

        if (cardToApprove.status !== Cards.renewal_pending) {
            return res.status(400).json({ error: `Ця картка не очікує підтвердження поновлення. Поточний статус: ${cardToApprove.status}` });
        }

        const approvedCard = await prisma.cards.update({
            where: { id: parseInt(cardId) },
            data: { status: Cards.active }
        });

        res.status(200).json({ message: "Поновлення картки успішно підтверджено.", card: approvedCard });
    } catch (error) {
        console.error("Помилка підтвердження поновлення картки:", error);
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
        res.status(200).json(pendingLoans);
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
    const { decision, finalInterestRate, finalTerm } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const adminUser = await prisma.users.findUnique({ where: { id: decoded.id } });
        if (!adminUser || adminUser.role !== "ADMIN") return res.status(403).json({ error: "Доступ заборонено." });

        const loan = await prisma.loans.findUnique({ where: { id: parseInt(loanId) } });
        if (!loan) return res.status(404).json({ error: "Заявку на кредит не знайдено." });
        if (loan.status !== Loans.waiting) return res.status(400).json({ error: `Неможливо змінити статус. Поточний статус: ${loan.status}` });

        let updatedLoanData = {};

        if (decision === 'approve') {
            updatedLoanData = {
                status: Loans.active,
                interest_rate: finalInterestRate ? parseFloat(finalInterestRate) : loan.interest_rate,
                term: finalTerm ? parseInt(finalTerm) : loan.term,
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

                await tx.cards.update({
                    where: { id: userActiveCard.id },
                    data: { balance: { increment: approvedLoan.amount } }
                });

                await tx.cardTransaction.create({
                    data: {
                        senderCardId: userActiveCard.id, // Умовно
                        receiverCardId: userActiveCard.id,
                        amount: approvedLoan.amount,
                        description: `Зарахування кредитних коштів. Кредит ID: ${approvedLoan.id}`,
                    }
                });
                return approvedLoan;
            });
            return res.status(200).json({ message: "Кредит схвалено, кошти зараховано.", loan: result });
        } else { // 'reject'
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
        if (error.message.startsWith("Неможливо видати кредит:")) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Внутрішня помилка сервера." });
    }
});

export default router;
