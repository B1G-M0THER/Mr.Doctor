import prisma from "../config/prisma.js";
import Deposits from "../constants/deposits.js";
import CardStatuses from "../constants/cards.js";

const DEFAULT_ANNUAL_INTEREST_RATE = 10.0;
const EARLY_WITHDRAWAL_PENALTY_PERCENT = 50.0;

function calculateSimpleInterest(principal, annualRate, startDate, endDate) {
    if (!startDate || !endDate || endDate <= startDate) {
        return 0;
    }
    const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return 0;
    const interest = principal * (annualRate / 100 / 365) * days;
    return parseFloat(interest.toFixed(2));
}

export const applyForDeposit = async (req, res) => {
    const userId = req.userId;
    const { amount, termInMonths } = req.body;

    const depositAmount = parseFloat(amount);
    const term = parseInt(termInMonths, 10);

    if (isNaN(depositAmount) || depositAmount <= 100) {
        return res.status(400).json({ error: "Сума депозиту повинна бути більшою за 100 UAH." });
    }
    if (isNaN(term) || term < 3 || term > 36) {
        return res.status(400).json({ error: "Термін депозиту повинен бути від 3 до 36 місяців." });
    }

    try {
        const userCard = await prisma.cards.findFirst({
            where: { holder_id: userId }
        });

        if (!userCard) {
            return res.status(403).json({ error: "Для оформлення депозиту необхідна активна банківська картка." });
        }
        if (userCard.status === CardStatuses.expired) {
            return res.status(403).json({ error: "Неможливо створити депозит: термін дії вашої картки закінчився." });
        }
        if (userCard.status === CardStatuses.blocked) {
            return res.status(403).json({ error: "Неможливо створити депозит: ваша картка заблокована." });
        }
        if (userCard.status !== CardStatuses.active) {
            return res.status(403).json({ error: `Неможливо створити депозит: ваша картка не активна (статус: ${userCard.status}).` });
        }
        if (parseFloat(userCard.balance) < depositAmount) {
            return res.status(400).json({ error: `Недостатньо коштів на картці для відкриття депозиту. Потрібно: ${depositAmount} UAH.` });
        }

        const newDepositApplication = await prisma.deposits.create({
            data: {
                user_id: userId,
                amount: depositAmount,
                interest_rate: DEFAULT_ANNUAL_INTEREST_RATE,
                term: term,
                status: Deposits.waiting_approval,
                early_withdrawal_penalty_percent: EARLY_WITHDRAWAL_PENALTY_PERCENT,
            },
        });
        res.status(201).json({
            message: "Заявку на депозит успішно подано. Очікуйте на розгляд.",
            depositApplication: newDepositApplication,
        });
    } catch (error) {
        console.error("Помилка при поданні заявки на депозит:", error);
        res.status(500).json({ error: "Внутрішня помилка сервера при обробці заявки на депозит." });
    }
};

export const getUserDeposits = async (req, res) => {
    const userId = req.userId;
    try {
        const deposits = await prisma.deposits.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
        });

        const now = new Date();
        const depositsWithCalculations = deposits.map(dep => {
            let calculated_accrued_interest = 0;
            let current_value = dep.amount;

            if (dep.status === Deposits.active && dep.approved_at) {
                const approvalDate = new Date(dep.approved_at);
                const maturityDate = dep.maturity_date ? new Date(dep.maturity_date) : null;

                let endDateForInterestCalc = now;

                if (maturityDate && now >= maturityDate) {
                    endDateForInterestCalc = maturityDate;
                }

                if (approvalDate < endDateForInterestCalc) {
                    calculated_accrued_interest = calculateSimpleInterest(
                        dep.amount,
                        dep.interest_rate,
                        approvalDate,
                        endDateForInterestCalc
                    );
                }
                current_value += calculated_accrued_interest;

            } else if (dep.status === Deposits.closed_early || dep.status === Deposits.closed_by_term) {
                calculated_accrued_interest = dep.calculated_accrued_interest || 0;
                current_value = dep.calculated_total_payout || dep.amount;
            }
            return {
                ...dep,
                current_value: parseFloat(current_value),
                calculated_accrued_interest: parseFloat(calculated_accrued_interest.toFixed(2))
            };
        });

        res.status(200).json(depositsWithCalculations);
    } catch (error) {
        console.error("Помилка отримання депозитів користувача:", error);
        res.status(500).json({ error: "Помилка сервера при отриманні депозитів." });
    }
};

export const requestEarlyWithdrawal = async (req, res) => {
    const userId = req.userId;
    const { depositId } = req.params;

    try {
        const deposit = await prisma.deposits.findUnique({
            where: { id: parseInt(depositId) },
        });

        if (!deposit || deposit.user_id !== userId) {
            return res.status(404).json({ error: "Депозит не знайдено або він не належить вам." });
        }
        if (deposit.status !== Deposits.active) {
            return res.status(400).json({ error: `Неможливо достроково розірвати депозит зі статусом "${deposit.status}".` });
        }

        if (deposit.maturity_date && new Date() >= new Date(deposit.maturity_date)) {
            return res.status(400).json({ error: "Термін депозиту вже завершився. Оберіть опцію 'Отримати кошти'." });
        }

        const userCard = await prisma.cards.findFirst({
            where: { holder_id: userId }
        });
        if (!userCard) {
            return res.status(403).json({ error: "Неможливо вивести кошти: у вас немає банківської картки для зарахування." });
        }
        if (userCard.status === CardStatuses.expired) {
            return res.status(403).json({ error: "Неможливо вивести кошти: термін дії вашої картки закінчився." });
        }
        if (userCard.status === CardStatuses.blocked) {
            return res.status(403).json({ error: "Неможливо вивести кошти: ваша картка заблокована." });
        }
        if (userCard.status !== CardStatuses.active) {
            return res.status(403).json({ error: `Неможливо вивести кошти: ваша картка не активна (статус: ${userCard.status}).` });
        }


        const now = new Date();
        const principalAmount = parseFloat(deposit.amount);
        const accruedInterest = calculateSimpleInterest(deposit.amount, deposit.interest_rate, new Date(deposit.approved_at), now);
        const penaltyRate = deposit.early_withdrawal_penalty_percent || EARLY_WITHDRAWAL_PENALTY_PERCENT;
        const penaltyAmount = parseFloat((accruedInterest * (penaltyRate / 100)).toFixed(2));
        const interestAfterPenalty = parseFloat((accruedInterest - penaltyAmount).toFixed(2));
        const totalPayout = principalAmount + interestAfterPenalty;

        await prisma.$transaction(async (tx) => {
            await tx.cards.update({
                where: { id: userCard.id },
                data: { balance: { increment: totalPayout } },
            });

            await tx.deposits.update({
                where: { id: parseInt(depositId) },
                data: {
                    status: Deposits.closed_early,
                    closed_at: now,
                    calculated_accrued_interest: interestAfterPenalty,
                    calculated_total_payout: totalPayout,
                },
            });
        });

        res.status(200).json({
            message: "Депозит успішно розірвано достроково. Кошти зараховані на вашу картку.",
            payoutDetails: {
                principal: deposit.amount,
                accruedInterestInitial: accruedInterest,
                penaltyAmount: penaltyAmount,
                interestPaid: interestAfterPenalty,
                totalPayout: totalPayout,
            }
        });

    } catch (error) {
        console.error("Помилка при достроковому розірванні депозиту:", error);
        res.status(500).json({ error: "Внутрішня помилка сервера." });
    }
};

export const withdrawMaturedDeposit = async (req, res) => {
    const userId = req.userId;
    const { depositId } = req.params;

    try {
        const deposit = await prisma.deposits.findUnique({
            where: { id: parseInt(depositId) },
        });

        if (!deposit || deposit.user_id !== userId) {
            return res.status(404).json({ error: "Депозит не знайдено або він не належить вам." });
        }

        if (deposit.status !== Deposits.active) {
            return res.status(400).json({ error: `Депозит не активний для виплати. Поточний статус: ${deposit.status}` });
        }
        if (!deposit.maturity_date || new Date() < new Date(deposit.maturity_date)) {
            return res.status(400).json({ error: "Термін депозиту ще не завершився." });
        }

        const userCard = await prisma.cards.findFirst({
            where: { holder_id: userId }
        });
        if (!userCard) { return res.status(403).json({ error: "Неможливо отримати кошти: у вас немає банківської картки." });}
        if (userCard.status === CardStatuses.expired) { return res.status(403).json({ error: "Неможливо отримати кошти: термін картки закінчився." }); }
        if (userCard.status === CardStatuses.blocked) { return res.status(403).json({ error: "Неможливо отримати кошти: картка заблокована." }); }
        if (userCard.status !== CardStatuses.active) { return res.status(403).json({ error: `Неможливо отримати кошти: картка не активна (статус: ${userCard.status}).` });}

        const approvalDate = new Date(deposit.approved_at);
        const maturityDate = new Date(deposit.maturity_date);

        const principalAmount = parseFloat(deposit.amount);
        const finalAccruedInterest = calculateSimpleInterest(deposit.amount, deposit.interest_rate, approvalDate, maturityDate);
        const totalPayout = principalAmount + finalAccruedInterest;

        await prisma.$transaction(async (tx) => {
            await tx.cards.update({
                where: { id: userCard.id },
                data: { balance: { increment: totalPayout } },
            });
            await tx.deposits.update({
                where: { id: parseInt(depositId) },
                data: {
                    status: Deposits.closed_by_term,
                    closed_at: new Date(),
                    calculated_accrued_interest: finalAccruedInterest,
                    calculated_total_payout: totalPayout,
                },
            });
        });

        res.status(200).json({
            message: "Кошти по депозиту успішно виплачено на вашу картку.",
            payoutDetails: {
                principal: deposit.amount,
                interestPaid: finalAccruedInterest,
                totalPayout: totalPayout,
            }
        });
    } catch (error) {
        console.error("Помилка при виплаті коштів по депозиту:", error);
        res.status(500).json({ error: "Внутрішня помилка сервера." });
    }
};