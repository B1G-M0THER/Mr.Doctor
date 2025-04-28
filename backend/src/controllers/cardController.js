import prisma from "../config/prisma.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import Cards from "../constants/cards.js";

const SECRET_KEY = process.env.SECRET_KEY;

export const decodeToken = (token) => {
    try {
        // Убираем возможный префикс "Bearer "
        const cleanToken = token.startsWith("Bearer ") ? token.split(" ")[1] : token;

        // Декодируем токен
        return  jwt.verify(cleanToken, SECRET_KEY);
    } catch (error) {
        console.error("Ошибка при разборе токена:", error.message);
        return null;
    }
};

// Функція для генерації номера картки за алгоритмом Луна
function generateCardNumber() {
    let cardNumberBase = "767964" + crypto.randomInt(100000000, 999999999); // 6 фіксованих + 9 випадкових
    let digits = cardNumberBase.split("").map(Number);

    // Алгоритм Луна
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
    return finalCardNumber.replace(/(\d{4})/g, "$1 ").trim();
}


// Функція для генерації CVC
function generateCVC() {
    return crypto.randomInt(100, 999);
}

// Контролер для створення картки
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
        // Генеруємо картку
        let cardNumber;
        let cardExists;
        do {
            cardNumber = generateCardNumber();
            cardExists = await prisma.cards.findUnique({ where: { card_number: cardNumber } });
        } while (cardExists);

        const newCard = await prisma.cards.create({
            data: {
                card_number: generateCardNumber(),
                cvc: generateCVC(),
                holder_id: user.id,
                pin: Number(pin),
                balance: 0,
                status: Cards.waiting, // Беремо статус із файлу cards.js
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
