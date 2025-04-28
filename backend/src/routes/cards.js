import express from 'express';
import prisma from '../config/prisma.js'; // Ваш Prisma клієнт
import jwt from 'jsonwebtoken'; // Потрібен для верифікації токена

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY; // Потрібен для верифікації

// Отримати активну картку поточного користувача
router.get('/mycard', async (req, res) => { // Забираємо authenticateToken з параметрів
    try {
        // --- Початок вбудованої логіки перевірки токена ---
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token == null) {
            return res.status(401).json({ error: 'Неавторизований доступ: токен відсутній.' });
        }

        let decodedPayload; // Змінна для збереження розкодованих даних
        try {
            decodedPayload = jwt.verify(token, SECRET_KEY);

            // Опціонально: Перевірка існування користувача в БД (рекомендовано)
            const userExists = await prisma.users.findUnique({
                where: { id: decodedPayload.id },
                select: { id: true }
            });
            if (!userExists) {
                console.warn(`User with ID ${decodedPayload.id} from token not found in DB (cards route).`);
                return res.status(401).json({ error: 'Неавторизований доступ: користувача не знайдено.' });
            }

        } catch (error) {
            // Обробка помилок верифікації токена
            console.error("Token verification error in /mycard:", error.message);
            if (error instanceof jwt.TokenExpiredError) {
                return res.status(401).json({ error: 'Неавторизований доступ: термін дії токена вийшов.' });
            }
            if (error instanceof jwt.JsonWebTokenError) {
                return res.status(401).json({ error: 'Неавторизований доступ: недійсний токен.' });
            }
            return res.status(500).json({ error: 'Помилка сервера при перевірці токена.' });
        }
        // --- Кінець вбудованої логіки перевірки токена ---

        // Тепер використовуємо ID користувача з розкодованого токена
        const userId = decodedPayload.id;

        if (!userId) {
            // Ця перевірка тепер менш імовірна, але залишаємо про всяк випадок
            console.error('ID користувача не визначено після верифікації токена у cards.js');
            return res.status(401).json({ error: 'Не вдалося ідентифікувати користувача.' });
        }

        // Основна логіка маршруту: пошук активної картки
        const activeCard = await prisma.cards.findFirst({
            where: {
                holder_id: userId,
                status: 'active' // Шукаємо тільки активні картки
            },
            select: { // Вибираємо тільки потрібні поля
                id: true,
                card_number: true,
                cvc: true,
                dueDate: true,
                status: true,
            }
        });

        if (activeCard) {
            return res.status(200).json(activeCard);
        } else {
            return res.status(404).json({ message: 'Активна картка не знайдена.' });
        }

    } catch (error) {
        // Загальна обробка помилок для основної логіки маршруту
        console.error("Помилка отримання картки користувача:", error);
        // Уникаємо повторної відправки заголовків, якщо помилка сталася після перевірки токена
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Помилка сервера при отриманні картки.' });
        }
    }
});

// Додайте інші маршрути тут...

export default router;
