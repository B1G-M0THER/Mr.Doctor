import express from 'express';
import { applyForLoan } from '../controllers/loanController.js';
import { authenticateToken } from './transactionRoutes.js';

const router = express.Router();

router.post('/apply', authenticateToken, applyForLoan);

export default router;