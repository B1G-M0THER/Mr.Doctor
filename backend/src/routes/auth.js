
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import Roles from "../constants/roles.js";// Подключение Prisma через сгенерированный клиент

const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY;

// Реєстрація
router.post("/register", async (req, res) => {
    const { name, email, phone_number, password } = req.body;

    if (!name || !email || !phone_number || !password) {
        return res.status(400).json({ error: "Заповніть всі поля!" });
    }

    try {
        const password_hash = await bcrypt.hash(password, 10);

        // Создаємо користувача в БД
        const newUser = await prisma.users.create({
            data: {
                name,
                email,
                phone_number,
                password_hash,
                role: Roles.NONE,
            },
        });

        res.status(201).json({ message: "Користувач зареєстрований!" });
    } catch (error) {
        res.status(500).json({ error: "Помилка: " + error.message });
    }
});

// Логін
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Заповніть всі поля!" });
    }

    try {

        const user = await prisma.users.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(404).json({ error: "Користувача не знайдено." });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(400).json({ error: "Неправильний пароль." });
        }

        // Створення токена
        const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, SECRET_KEY, {
            expiresIn: "14d",
        });

        res.status(200).json({ token, role: user.role, userId: user.id });
    } catch (error) {
        res.status(500).json({ error: "Помилка сервера." });
    }
});

// Профіль
router.get("/profile", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Неавторизований доступ." });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const user = await prisma.users.findUnique({
            where: { id: decoded.id },
        });

        if (!user) {
            return res.status(404).json({ error: "Користувача не знайдено." });
        }

        res.status(200).json({
            name: user.name,
            email: user.email,
            phone_number: user.phone_number,
            role: user.role
        });
    } catch (error) {
        res.status(401).json({ error: "Недійсний токен." });
    }
});

export default router;