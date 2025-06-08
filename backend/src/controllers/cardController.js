import prisma from "../config/prisma.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import Cards from "../constants/cards.js";
import { parseDueDate, generateFutureDueDateString } from "../utils/dateUtils.js";

const SECRET_KEY = process.env.SECRET_KEY;
const MAX_CARD_BALANCE = 1000000000;

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
    if (topUpAmount > 100000) {
        return res.status(400).json({ error: "Максимальна сума одного поповнення - 100,000 UAH." });
    }

    try {
        let card = await prisma.cards.findFirst({
            where: {holder_id: userId}
        });

        if (!card) {
            return res.status(404).json({ error: "Активна картка для поповнення не знайдена." });
        }

        card = await checkAndHandleCardExpiry(card);
        const currentBalance = parseFloat(card.balance);

        if (card.status === Cards.expired) {
            return res.status(403).json({ error: "Операція неможлива: термін дії картки закінчився. Поновіть картку." });
        }
        if (card.status === Cards.renewal_pending) {
            return res.status(403).json({ error: "Операція неможлива: картка очікує підтвердження поновлення." });
        }
        if (card.status === Cards.blocked) {
            return res.status(403).json({ error: "Операція неможлива: картка заблокована." });
        }
        if (card.status === Cards.waiting) {
            return res.status(403).json({ error: "Операція неможлива: картка очікує активації адміністратором." });
        }
        if (card.status !== Cards.active) {
            return res.status(403).json({ error: `Операція неможлива: статус картки "${card.status}".` });
        }
        if (currentBalance + topUpAmount > MAX_CARD_BALANCE) {
            return res.status(400).json({ error: `Поповнення неможливе. Максимальний баланс картки (${MAX_CARD_BALANCE.toLocaleString('uk-UA')} UAH) буде перевищено.` });
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
    let cardNumberBase = "767964" + crypto.randomInt(100000000, 999999999);
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

export async function checkAndHandleCardExpiry(card) {
    if (!card) { // Додамо перевірку, хоча /mycard вже це робить
        console.log('[checkAndHandleCardExpiry] Card object is null or undefined.');
        return card;
    }
    console.log(`[checkAndHandleCardExpiry] Checking card ID: ${card.id}, Status: ${card.status}, DueDate: ${card.dueDate}`);

    if (card.status !== Cards.active) {
        console.log('[checkAndHandleCardExpiry] Card is not active, skipping expiry update.');
        return card;
    }

    const dueDateObject = parseDueDate(card.dueDate);
    console.log(`[checkAndHandleCardExpiry] Parsed dueDateObject: ${dueDateObject}`);

    if (!dueDateObject) {
        console.warn(`[checkAndHandleCardExpiry] Card ${card.card_number} has invalid dueDate format: ${card.dueDate}. Skipping expiry check.`);
        return card;
    }

    const now = new Date();
    console.log(`[checkAndHandleCardExpiry] Current date (now): ${now}`);
    console.log(`[checkAndHandleCardExpiry] Condition (now >= dueDateObject): ${now >= dueDateObject}`);

    if (now >= dueDateObject) {
        try {
            console.log(`[checkAndHandleCardExpiry] Card ID ${card.id} is determined expired. Attempting to update status in DB...`);
            const updatedCard = await prisma.cards.update({
                where: { id: card.id },
                data: { status: Cards.expired },
            });
            console.log(`[checkAndHandleCardExpiry] Card ${updatedCard.card_number} status successfully updated in DB to ${Cards.expired}.`);
            return updatedCard;
        } catch (error) {
            console.error(`[checkAndHandleCardExpiry] Error updating card ${card.card_number} to ${Cards.expired}:`, error);
            return card;
        }
    }
    console.log(`[checkAndHandleCardExpiry] Card ID ${card.id} is not expired.`);
    return card;
}

export const requestCardRenewal = async (req, res) => {
    let userId;
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Неавторизований доступ: токен відсутній.' });
        let decodedPayload;
        try {
            decodedPayload = jwt.verify(token, SECRET_KEY);
            const userExists = await prisma.users.findUnique({ where: { id: decodedPayload.id } });
            if (!userExists) return res.status(401).json({ error: 'Неавторизований доступ: користувача не знайдено.' });
            userId = decodedPayload.id;
        } catch (jwtError) {
            if (jwtError instanceof jwt.TokenExpiredError) return res.status(401).json({ error: 'Токен прострочено.' });
            if (jwtError instanceof jwt.JsonWebTokenError) return res.status(401).json({ error: 'Недійсний токен.' });
            console.error("Token verification error in /cards/renew:", jwtError.message);
            return res.status(500).json({ error: 'Помилка перевірки токена.' });
        }
    } catch (e) {
        console.error("Auth block error in /cards/renew:", e);
        return res.status(500).json({ error: 'Помилка автентифікації.' });
    }
    if (!userId) return res.status(401).json({ error: 'Не вдалося ідентифікувати користувача.' });

    const { newPin } = req.body;

    if (!newPin || String(newPin).length !== 4 || isNaN(newPin)) {
        return res.status(400).json({ error: "Новий PIN має бути 4-значним числом." });
    }

    try {
        let currentCard = await prisma.cards.findFirst({
            where: { holder_id: userId }
        });

        if (!currentCard) {
            return res.status(404).json({ error: "Картку для поновлення не знайдено." });
        }

        currentCard = await checkAndHandleCardExpiry(currentCard);

        if (currentCard.status !== Cards.expired) {
            if (currentCard.status === Cards.renewal_pending) {
                return res.status(400).json({ error: "Картка вже очікує на підтвердження поновлення." });
            }
            return res.status(400).json({ error: `Поновлення можливе тільки для прострочених карток. Поточний статус: ${currentCard.status}` });
        }

        let newCardNumber;
        let cardExists;
        do {
            newCardNumber = generateCardNumber();
            cardExists = await prisma.cards.findUnique({ where: { card_number: newCardNumber } });
        } while (cardExists);

        const newCvv = generateCVV();
        const newDueDateString = generateFutureDueDateString(10);

        const updatedCard = await prisma.cards.update({
            where: { id: currentCard.id },
            data: {
                card_number: newCardNumber,
                cvv: newCvv,
                pin: Number(newPin),
                dueDate: newDueDateString,
                status: Cards.renewal_pending,
            }
        });

        res.status(200).json({
            message: "Запит на поновлення картки прийнято. Очікуйте підтвердження адміністратора.",
            updatedCardPreview: {
                cardNumber: updatedCard.card_number,
                dueDate: updatedCard.dueDate,
                status: updatedCard.status,
            }
        });

    } catch (error) {
        console.error("Помилка при запиті на поновлення картки:", error);
        res.status(500).json({ error: "Помилка сервера при поновленні картки." });
    }
};

