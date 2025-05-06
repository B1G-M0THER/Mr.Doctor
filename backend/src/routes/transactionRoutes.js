import express from 'express';
import { performCardTransfer } from '../controllers/transactionController.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY;

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ error: 'Неавторизований доступ: токен відсутній.' });
    }

    jwt.verify(token, SECRET_KEY, (err, decodedPayload) => {
        if (err) {
            if (err instanceof jwt.TokenExpiredError) {
                return res.status(401).json({ error: 'Неавторизований доступ: термін дії токена вийшов.' });
            }
            if (err instanceof jwt.JsonWebTokenError) {
                return res.status(401).json({ error: 'Неавторизований доступ: недійсний токен.' });
            }
            return res.status(403).json({ error: 'Неавторизований доступ: помилка верифікації токена.' });
        }

        req.userId = decodedPayload.id;
        next();
    });
};

router.post('/transfer', authenticateToken, performCardTransfer);

export default router;
