import express from 'express';
import prisma from '../config/prisma.js';
import jwt from 'jsonwebtoken';
import { createCard, topUpCardBalance } from "../controllers/cardController.js";

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY;

router.post("/create", createCard);

router.get('/mycard', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token == null) {
            return res.status(401).json({ error: 'Неавторизований доступ: токен відсутній.' });
        }

        let decodedPayload;
        try {
            decodedPayload = jwt.verify(token, SECRET_KEY);
            const userExists = await prisma.users.findUnique({
                where: { id: decodedPayload.id },
                select: { id: true }
            });
            if (!userExists) {
                console.warn(`User with ID ${decodedPayload.id} from token not found in DB (cards route).`);
                return res.status(401).json({ error: 'Неавторизований доступ: користувача не знайдено.' });
            }

        } catch (error) {
            console.error("Token verification error in /create:", error.message);
            if (error instanceof jwt.TokenExpiredError) {
                return res.status(401).json({ error: 'Неавторизований доступ: термін дії токена вийшов.' });
            }
            if (error instanceof jwt.JsonWebTokenError) {
                return res.status(401).json({ error: 'Неавторизований доступ: недійсний токен.' });
            }
            return res.status(500).json({ error: 'Помилка сервера при перевірці токена.' });
        }

        const userId = decodedPayload.id;

        if (!userId) {
            console.error('ID користувача не визначено після верифікації токена у cards.js');
            return res.status(401).json({ error: 'Не вдалося ідентифікувати користувача.' });
        }

        const activeCard = await prisma.cards.findFirst({
            where: {
                holder_id: userId,
            },
            select: {
                id: true,
                card_number: true,
                cvc: true,
                dueDate: true,
                status: true,
                balance: true,
            }
        });

        if (activeCard) {
            return res.status(200).json(activeCard);
        } else {
            return res.status(404).json({ message: 'Активна картка не знайдена.' });
        }

    } catch (error) {
        console.error("Помилка отримання картки користувача:", error);

        if (!res.headersSent) {
            return res.status(500).json({ error: 'Помилка сервера при отриманні картки.' });
        }
    }
});

router.post('/topup', topUpCardBalance);

export default router;
