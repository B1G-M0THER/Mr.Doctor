import express from 'express';
import prisma from '../config/prisma.js';
import jwt from 'jsonwebtoken';
import {
    createCard,
    topUpCardBalance,
    requestCardRenewal,
    checkAndHandleCardExpiry
} from "../controllers/cardController.js";

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY;

router.post("/create", createCard);

router.get('/mycard', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token == null) return res.status(401).json({ error: 'Неавторизований доступ: токен відсутній.' });

        let decodedPayload;
        try {
            decodedPayload = jwt.verify(token, SECRET_KEY);
            const userExists = await prisma.users.findUnique({ where: { id: decodedPayload.id }, select: { id: true } });
            if (!userExists) return res.status(401).json({ error: 'Неавторизований доступ: користувача не знайдено.' });
        } catch (error) {
            console.error("Token verification error in /mycard route:", error.message);
            if (error instanceof jwt.TokenExpiredError) return res.status(401).json({ error: 'Термін дії токена вийшов.' });
            if (error instanceof jwt.JsonWebTokenError) return res.status(401).json({ error: 'Недійсний токен.' });
            return res.status(500).json({ error: 'Помилка сервера при перевірці токена.' });
        }

        const userId = decodedPayload.id;
        if (!userId) return res.status(401).json({ error: 'Не вдалося ідентифікувати користувача.' });

        let userCard = await prisma.cards.findFirst({
            where: { holder_id: userId },
        });

        console.log('[BACKEND /mycard] Initial card from DB:', JSON.stringify(userCard, null, 2));

        if (userCard) {
            userCard = await checkAndHandleCardExpiry(userCard);

            const responsePayload = {
                id: userCard.id,
                card_number: userCard.card_number,
                cvv: userCard.cvv,
                dueDate: userCard.dueDate,
                status: userCard.status,
                balance: userCard.balance,
            };
            // ЛОГУВАННЯ 3: Що відправляємо на фронтенд
            console.log('[BACKEND /mycard] Payload to frontend:', JSON.stringify(responsePayload, null, 2));
            return res.status(200).json(responsePayload);
        } else {
            console.log('[BACKEND /mycard] Card not found for user, returning 404.');
            return res.status(404).json({ message: 'Картка не знайдена.' });
        }
    } catch (error) {
        console.error("Помилка отримання картки користувача:", error);
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Помилка сервера при отриманні картки.' });
        }
    }
});

router.post('/topup', topUpCardBalance);
router.post('/renew', requestCardRenewal);

export default router;