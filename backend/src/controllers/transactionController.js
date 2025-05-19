import prisma from "../config/prisma.js";
import CardStatuses from "../constants/cards.js";
import { checkAndHandleCardExpiry } from './cardController.js';

export const performCardTransfer = async (req, res) => {
    const senderUserId = req.userId;

    if (!senderUserId) {
        return res.status(401).json({ error: "Неавторизований доступ: користувач не ідентифікований." });
    }

    const { receiverCardNumber, amount, senderCVV, senderPIN } = req.body;

    if (!receiverCardNumber || !amount || !senderCVV || !senderPIN) {
        return res.status(400).json({ error: "Будь ласка, заповніть всі необхідні поля: номер картки отримувача, суму, ваш CVV та PIN-код." });
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
        return res.status(400).json({ error: "Сума переказу повинна бути позитивним числом." });
    }

    const cvv = parseInt(senderCVV, 10);
    const pin = parseInt(senderPIN, 10);

    if (isNaN(cvv) || isNaN(pin)) {
        return res.status(400).json({ error: "CVV та PIN-код повинні бути числами." });
    }

    if (senderCVV.length !== 3 || senderPIN.length !== 4) {
        return res.status(400).json({ error: "CVV повинен складатися з 3 цифр, а PIN-код - з 4 цифр." });
    }


    try {
        const result = await prisma.$transaction(async (tx) => {

            let senderCard = await tx.cards.findFirst({
                where: {
                    holder_id: senderUserId,
                },
            });

            if (!senderCard) {
                throw { status: 404, message: "Картку відправника не знайдено." };
            }

            senderCard = await checkAndHandleCardExpiry(senderCard);


            if (senderCard.status === CardStatuses.expired) {
                throw { status: 403, message: "Операція неможлива: термін дії вашої картки закінчився. Будь ласка, поновіть картку." };
            }
            if (senderCard.status === CardStatuses.renewal_pending) {
                throw { status: 403, message: "Операція неможлива: ваша картка очікує підтвердження поновлення адміністратором." };
            }
            if (senderCard.status === CardStatuses.blocked) {
                throw { status: 403, message: "Операція неможлива: ваша картка заблокована." };
            }
            if (senderCard.status === CardStatuses.waiting) {
                throw { status: 403, message: "Операція неможлива: ваша картка ще не активована адміністратором." };
            }
            if (senderCard.status !== CardStatuses.active) {
                throw { status: 403, message: `Операція неможлива: статус вашої картки "${senderCard.status}".` };
            }

            if (senderCard.pin !== pin) {
                throw { status: 403, message: "Неправильний PIN-код." };
            }
            if (senderCard.cvv !== cvv) {
                throw { status: 403, message: "Неправильний CVV." };
            }

            if (senderCard.balance < transferAmount) {
                throw { status: 400, message: "Недостатньо коштів на балансі." };
            }

            const receiverCard = await tx.cards.findUnique({
                where: {
                    card_number: receiverCardNumber,
                },
            });

            if (!receiverCard) {
                throw { status: 404, message: "Картку отримувача не знайдено." };
            }
            if (receiverCard.status !== CardStatuses.active) {
                throw { status: 400, message: "Картка отримувача не активна і не може приймати перекази." };
            }

            if (senderCard.id === receiverCard.id) {
                throw { status: 400, message: "Неможливо переказати кошти на власну картку." };
            }

            const updatedSenderCard = await tx.cards.update({
                where: { id: senderCard.id },
                data: { balance: { decrement: transferAmount } },
            });

            const updatedReceiverCard = await tx.cards.update({
                where: { id: receiverCard.id },
                data: { balance: { increment: transferAmount } },
            });

            const description = `Переказ з картки ...${senderCard.card_number.slice(-4)} на картку ...${receiverCard.card_number.slice(-4)} на суму ${transferAmount.toFixed(2)} UAH.`;

            const transaction = await tx.cardTransaction.create({
                data: {
                    senderCardId: senderCard.id,
                    receiverCardId: receiverCard.id,
                    amount: transferAmount,
                    description: description,
                },
            });

            return {
                message: "Переказ успішно виконано!",
                transactionId: transaction.id,
                newSenderBalance: updatedSenderCard.balance,
                description: transaction.description,
                timestamp: transaction.timestamp
            };
        });

        res.status(200).json(result);

    } catch (error) {
        console.error("Помилка під час переказу коштів:", error);
        if (error.status && error.message) {
            res.status(error.status).json({ error: error.message });
        } else if (error.message) {
            res.status(500).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: "Внутрішня помилка сервера під час обробки переказу." });
        }
    }
};