import prisma from "../config/prisma.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import Cards from "../constants/cards.js";

const SECRET_KEY = process.env.SECRET_KEY;

export const topUpCardBalance = async (req, res) => {
    let userId;

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
                console.warn(`User with ID ${decodedPayload.id} from token not found in DB (topup route).`);
                return res.status(401).json({ error: 'Неавторизований доступ: користувача не знайдено.' });
            }

            userId = decodedPayload.id;

        } catch (error) {
            console.error("Token verification error in /topup:", error.message);
            if (error instanceof jwt.TokenExpiredError) {
                return res.status(401).json({ error: 'Неавторизований доступ: термін дії токена вийшов.' });
            }
            if (error instanceof jwt.JsonWebTokenError) {
                return res.status(401).json({ error: 'Неавторизований доступ: недійсний токен.' });
            }

            return res.status(500).json({ error: 'Помилка сервера при перевірці токена.' });
        }
    } catch (e) {
        console.error("Error during auth block in /topup:", e);
        return res.status(500).json({ error: 'Внутрішня помилка сервера під час автентифікації.' });
    }

    if (!userId) {
        console.error('userId is undefined after auth block in topUpCardBalance');
        return res.status(401).json({ error: 'Не вдалося ідентифікувати користувача.' });
    }

    const { amount } = req.body;
    const topUpAmount = parseFloat(amount);
    if (isNaN(topUpAmount) || topUpAmount <= 0) {
        return res.status(400).json({ error: "Некоректна сума поповнення." });
    }

    try {
        const card = await prisma.cards.findFirst({
            where: {
                holder_id: userId,
                status: Cards.active
            }
        });

        if (!card) {
            return res.status(404).json({ error: "Активна картка для поповнення не знайдена." });
        }

        const updatedCard = await prisma.cards.update({
            where: { id: card.id },
            data: { balance: { increment: topUpAmount } }
        });

        res.status(200).json({
            message: "Баланс картки успішно поповнено.",
            newBalance: updatedCard.balance
        });

    } catch (error) {
        console.error("Помилка при поповненні картки:", error);
        res.status(500).json({ error: "Помилка сервера при поповненні картки." });
    }
};

export const decodeToken = (token) => {
    try {
        const cleanToken = token.startsWith("Bearer ") ? token.split(" ")[1] : token;
        return  jwt.verify(cleanToken, SECRET_KEY);
    } catch (error) {
        console.error("Ошибка при разборе токена:", error.message);
        return null;
    }
};

function generateCardNumber() {
    let cardNumberBase = "767964" + crypto.randomInt(100000000, 999999999); // 6 фіксованих + 9 випадкових
    let digits = cardNumberBase.split("").map(Number);

    let sum = 0;
    for (let i = digits.length - 1; i >= 0; i -= 2) {
        sum += digits[i];
        if (i - 1 >= 0) {
            let double = digits[i - 1] * 2;
            sum += double > 9 ? double - 9 : double;
        }
    }

    let lastDigit = (10 - (sum % 10)) % 10;
    let finalCardNumber = cardNumberBase + lastDigit.toString();
    return finalCardNumber;
}

function generateCVV() {
    return crypto.randomInt(100, 999);
}

export const createCard = async (req, res) => {
    const {token, pin } = req.body;

    if ( !pin || pin.length !== 4 || isNaN(pin)) {
        return res.status(400).json({ error: "Некоректні дані!" });
    }

    try {
        console.log(token);
        const decoded = decodeToken(token);

        const user = await prisma.users.findUnique({ where: { id: decoded.id } });
        if (!user) {
            return res.status(404).json({ error: "Користувача не знайдено!" });
        }

        let cardNumber;
        let cardExists;
        do {
            cardNumber = generateCardNumber();
            cardExists = await prisma.cards.findUnique({ where: { card_number: cardNumber } });
        } while (cardExists);

        const newCard = await prisma.cards.create({
            data: {
                card_number: generateCardNumber(),
                cvv: generateCVV(),
                holder_id: user.id,
                pin: Number(pin),
                balance: 0,
                status: Cards.waiting,
                dueDate: "00/00",
            },
        });

        const newToken = jwt.sign({ id: user.id, name: user.name, role: user.role }, SECRET_KEY, {
            expiresIn: "7d",
        });

        res.status(201).json({ message: "Картка створена!", cardNumber: newCard.card_number, token: newToken });
    } catch (error) {
        console.error("Помилка сервера:", error);
        res.status(500).json({ error: "Помилка сервера: " + error.message });
    }
};
