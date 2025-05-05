import express from "express";
import prisma from "../config/prisma.js";
import jwt from "jsonwebtoken";
import Cards from "../constants/cards.js";

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
                        name: true
                    }
                }},
        });

        const formattedCards = waitingCards.map(card => ({
            id: card.id,
            card_number: card.card_number,
            status: card.status,
            holder_name: card.Users.name,
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

export default router;
