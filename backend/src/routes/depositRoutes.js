import express from 'express';
import { applyForDeposit, getUserDeposits, requestEarlyWithdrawal, withdrawMaturedDeposit } from '../controllers/depositController.js';
import { authenticateToken } from './transactionRoutes.js';

const router = express.Router();

router.post('/apply', authenticateToken, applyForDeposit);
router.get('/my', authenticateToken, getUserDeposits);
router.post('/:depositId/withdraw-early', authenticateToken, requestEarlyWithdrawal);
router.post('/:depositId/withdraw-matured', authenticateToken, withdrawMaturedDeposit);

export default router;