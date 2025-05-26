import express from 'express';
import { applyForLoan, getUserLoans, makeLoanPayment, deleteUserLoan } from '../controllers/loanController.js';
import { authenticateToken } from './transactionRoutes.js';

const router = express.Router();

router.post('/apply', authenticateToken, applyForLoan);
router.get('/my', authenticateToken, getUserLoans);
router.post('/:loanId/pay', authenticateToken, makeLoanPayment);
router.delete('/:loanId', authenticateToken, deleteUserLoan);

export default router;