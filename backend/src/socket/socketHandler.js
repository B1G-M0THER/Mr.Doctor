import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js'; // Переконайтесь, що шлях правильний

// Зберігаємо підключення: Map { userId: socketId }
const connectedUsers = new Map();
const connectedAdmins = new Map();

const SECRET_KEY = process.env.SECRET_KEY; // Переконайтесь, що SECRET_KEY є у .env файлі

// Основна функція ініціалізації Socket.IO
export default function initializeSocket(io) {

    // Middleware для автентифікації кожного нового сокет-з'єднання
    io.use(async (socket, next) => {
        // Отримуємо токен, переданий клієнтом при підключенні
        const token = socket.handshake.auth.token;
        if (!token) {
            console.error('[Socket Auth] Error: Token not provided.');
            return next(new Error("Authentication error: Token not provided"));
        }
        try {
            // Перевіряємо токен
            const decoded = jwt.verify(token, SECRET_KEY);
            // Додаємо дані користувача до об'єкта сокета для подальшого використання
            socket.userId = decoded.id;
            socket.userRole = decoded.role;
            console.log(`[Socket Auth] Success: User ${decoded.id}, Role ${decoded.role}`);
            next(); // Дозволяємо підключення
        } catch (err) {
            console.error('[Socket Auth] Error: Invalid token.', err.message);
            next(new Error("Authentication error: Invalid token")); // Відхиляємо підключення
        }
    });

    // Обробник події 'connection' - спрацьовує, коли клієнт успішно пройшов автентифікацію
    io.on('connection', (socket) => {
        console.log(`[Connection] User connected: ${socket.userId} with role ${socket.userRole}, socket ID: ${socket.id}`);

        // Зберігаємо ID сокета для підключеного користувача або адміна
        if (socket.userRole === 'ADMIN') {
            connectedAdmins.set(socket.userId, socket.id);
            console.log('[Connection] Current connected admins:', Array.from(connectedAdmins.keys()));
        } else {
            connectedUsers.set(socket.userId, socket.id);
            console.log('[Connection] Current connected users:', Array.from(connectedUsers.keys()));
        }

        // --- Обробники подій від клієнта ---
        if (socket.userRole === 'ADMIN') { // Переконуємось, що це адмін
            socket.on('adminDeleteChat', async (data) => {
                const { userIdToDelete } = data || {};
                const adminId = socket.userId; // ID адміна, який робить запит

                console.log(`[adminDeleteChat] Request received: adminId=${adminId}, userIdToDelete=${userIdToDelete}`);

                if (!userIdToDelete || typeof userIdToDelete !== 'number' || userIdToDelete <= 0) {
                    console.error("[adminDeleteChat] Invalid userIdToDelete received:", userIdToDelete);
                    return socket.emit('chatError', { message: 'Invalid user ID specified for deletion.' });
                }

                try {
                    console.log(`[adminDeleteChat] Attempting to delete messages between any admin and user ${userIdToDelete}`);

                    // Видаляємо всі повідомлення, де:
                    // 1. Відправник - користувач, Отримувач - будь-який адмін
                    // 2. Відправник - будь-який адмін, Отримувач - користувач
                    const deleteResult = await prisma.chatMessage.deleteMany({
                        where: {
                            OR: [
                                { senderId: userIdToDelete, Receiver: { role: 'ADMIN' } },
                                { receiverId: userIdToDelete, Sender: { role: 'ADMIN' } }
                            ]
                        }
                    });

                    console.log(`[adminDeleteChat] Deleted ${deleteResult.count} messages for user ${userIdToDelete}.`);

                    // Надсилаємо підтвердження адміну, який зробив запит
                    socket.emit('chatDeleted', { userId: userIdToDelete, count: deleteResult.count });

                    // Опціонально: сповістити інших адмінів про видалення чату,
                    // щоб вони могли оновити свої списки, якщо потрібно
                    const allAdminSocketIds = Array.from(connectedAdmins.values()).filter(id => id !== socket.id); // Всі, крім поточного
                    if (allAdminSocketIds.length > 0) {
                        io.to(allAdminSocketIds).emit('chatListUpdate', { message: `Chat with user ${userIdToDelete} deleted by admin ${adminId}.` });
                        // Фронтенд адмінів може слухати 'chatListUpdate' і перезавантажувати свій список
                    }

                } catch (error) {
                    console.error(`[adminDeleteChat] Error deleting chat for user ${userIdToDelete}:`, error);
                    socket.emit('chatError', { message: `Failed to delete chat history for user ${userIdToDelete}.` });
                }
            });
        }

        /**
         * Обробник надсилання повідомлення
         * data: { receiverId: number|null, content: string }
         * receiverId - ID користувача-отримувача (якщо відправник - адмін)
         * receiverId - Може бути 0 або ігноруватися (якщо відправник - клієнт)
         */
        socket.on('sendMessage', async (data) => {
            const senderId = socket.userId;
            const senderRole = socket.userRole;
            let { receiverId, content } = data || {}; // Безпечне отримання даних

            console.log(`[sendMessage] Received: senderId=${senderId}, senderRole=${senderRole}, intendedReceiverId=${receiverId}, content="${content}"`);

            // Перевірка вхідних даних
            if (!content || content.trim() === "") {
                console.log('[sendMessage] Error: Empty content.');
                socket.emit('chatError', { message: 'Cannot send empty message.' });
                return;
            }

            let actualReceiverId; // Реальний ID отримувача для збереження в БД
            let targetSocketId = null; // ID сокету для доставки в реальному часі

            try {
                // --- Логіка визначення реального отримувача (actualReceiverId) ---
                if (senderRole === 'ADMIN') {
                    // Якщо адмін надсилає, receiverId має бути ID клієнта
                    if (!receiverId || typeof receiverId !== 'number' || receiverId <= 0) {
                        console.error('[sendMessage] Error: Admin must specify a valid receiver user ID.');
                        return socket.emit('chatError', { message: 'Admin must specify recipient user ID.' });
                    }
                    actualReceiverId = receiverId;
                    targetSocketId = connectedUsers.get(actualReceiverId); // Шукаємо підключеного клієнта
                    console.log(`[sendMessage] Admin ${senderId} sending to User ${actualReceiverId}. Target socket: ${targetSocketId}`);

                } else {
                    // Якщо клієнт надсилає адміну
                    const onlineAdminIds = Array.from(connectedAdmins.keys());
                    if (onlineAdminIds.length > 0) {
                        // Вибираємо першого доступного онлайн адміна
                        actualReceiverId = onlineAdminIds[0]; // Можна реалізувати іншу логіку вибору (round-robin, etc.)
                        targetSocketId = connectedAdmins.get(actualReceiverId);
                        console.log(`[sendMessage] Client ${senderId} sending to first online Admin ${actualReceiverId}. Target socket: ${targetSocketId}`);
                    } else {
                        // Немає адмінів онлайн, шукаємо будь-якого адміна в базі даних
                        console.log(`[sendMessage] No admins online. Searching DB for any admin...`);
                        const anyAdmin = await prisma.users.findFirst({
                            where: { role: 'ADMIN' },
                            select: { id: true } // Вибираємо тільки ID
                        });

                        if (anyAdmin) {
                            actualReceiverId = anyAdmin.id;
                            targetSocketId = null; // Адмін офлайн
                            console.log(`[sendMessage] Found admin in DB (offline): ${actualReceiverId}. Message will be saved.`);
                        } else {
                            // Якщо адмінів взагалі немає в системі
                            console.error('[sendMessage] Error: No Admin user found in the database.');
                            return socket.emit('chatError', { message: 'Support is currently unavailable. No admin accounts found.' });
                        }
                    }
                }

                // Перевірка, чи вдалося визначити ID отримувача
                if (typeof actualReceiverId !== 'number' || actualReceiverId <= 0) {
                    console.error('[sendMessage] Error: Could not determine actualReceiverId.');
                    return socket.emit('chatError', { message: 'Failed to determine message recipient.' });
                }

                // --- Збереження повідомлення в БД ---
                const messageData = {
                    senderId: senderId,
                    receiverId: actualReceiverId, // Завжди ID конкретного адміна або клієнта
                    content: content, // TODO: Розглянути санітизацію HTML/скриптів
                };
                console.log('[sendMessage] Attempting to save message with data:', messageData);

                const message = await prisma.chatMessage.create({
                    data: messageData,
                    include: {
                        Sender: { select: { id: true, name: true, role: true } },
                        // Опціонально: додати дані отримувача, якщо потрібно
                        Receiver: { select: { id: true, name: true, role: true } }
                    }
                });
                console.log('[sendMessage] Message saved successfully to DB. ID:', message.id);

                // --- Надсилання повідомлення та сповіщень ---
                if (targetSocketId) {
                    // Надсилаємо 'receiveMessage' конкретному онлайн отримувачу (адміну або клієнту)
                    console.log(`[sendMessage] Emitting 'receiveMessage' to target socket ${targetSocketId}`);
                    io.to(targetSocketId).emit('receiveMessage', message);

                    // Якщо відправляв клієнт, сповістимо ВСІХ онлайн адмінів про активність чату
                    if(senderRole !== 'ADMIN') {
                        const allAdminSocketIds = Array.from(connectedAdmins.values());
                        if(allAdminSocketIds.length > 0) {
                            console.log(`[sendMessage] Emitting 'newUserMessage' for user ${senderId} to all admin sockets: ${allAdminSocketIds.join(',')}`);
                            // Надсилаємо ID користувача та його ім'я, щоб адміни могли оновити список
                            io.to(allAdminSocketIds).emit('newUserMessage', { userId: senderId, userName: message.Sender.name });
                        }
                    }
                } else {
                    // Якщо отримувач офлайн
                    console.log(`[sendMessage] Target user/admin ${actualReceiverId} is not connected. Message saved only.`);
                    // TODO: Можна реалізувати механізм сповіщення офлайн користувачів/адмінів
                }

                // Надсилаємо підтвердження ('messageSent') назад відправнику
                socket.emit('messageSent', message);
                console.log(`[sendMessage] Emitted 'messageSent' confirmation back to sender socket ${socket.id}`);

            } catch (error) {
                // Обробка будь-яких помилок під час процесу
                console.error("[sendMessage] CRITICAL ERROR:", error);
                socket.emit('chatError', { message: 'Failed to process message on server. Check server logs for details.' });
            }
        });

        /**
         * Обробник запиту на завантаження історії чату
         * data: { userId?: number }
         * userId - ID користувача, чат з яким хоче завантажити адмін.
         * Якщо запит від клієнта, userId може бути відсутнім або 0 (не використовується в новій логіці).
         */
        socket.on('loadHistory', async (data) => {
            const { userId } = data || {}; // ID іншого учасника чату (актуально для адміна)
            const currentUserId = socket.userId; // ID того, хто запитує історію
            const currentUserRole = socket.userRole;

            console.log(`[loadHistory] Request received: requesterId=${currentUserId}, requesterRole=${currentUserRole}, targetUserId=${userId}`);

            try {
                let messages;
                if (currentUserRole === 'ADMIN') {
                    // --- Адмін завантажує історію з конкретним клієнтом ---
                    if (!userId || typeof userId !== 'number' || userId <= 0) {
                        console.error("[loadHistory] Admin requested history without a valid target userId.");
                        return socket.emit('chatError', { message: 'Please select a user chat to load history.' });
                    }
                    console.log(`[loadHistory] Admin ${currentUserId} loading chat history with user ${userId}`);
                    messages = await prisma.chatMessage.findMany({
                        where: {
                            // АБО (Повідомлення від Адміна до Клієнта) АБО (Повідомлення від Клієнта до Адміна)
                            OR: [
                                { senderId: currentUserId, receiverId: userId },
                                { senderId: userId, receiverId: currentUserId }
                            ]
                        },
                        orderBy: { createdAt: 'asc' },
                        include: { // Включаємо дані відправника та отримувача
                            Sender: { select: { id: true, name: true, role: true } },
                            Receiver: { select: { id: true, name: true, role: true } }
                        }
                    });
                } else {
                    // --- Клієнт завантажує свою історію з адмінами ---
                    console.log(`[loadHistory] Client ${currentUserId} loading chat history with admins`);
                    messages = await prisma.chatMessage.findMany({
                        where: {
                            OR: [
                                // Повідомлення від Клієнта (мене) до будь-якого Адміна
                                { senderId: currentUserId, Receiver: { role: 'ADMIN' } },
                                // Повідомлення від будь-якого Адміна до Клієнта (мене)
                                { receiverId: currentUserId, Sender: { role: 'ADMIN' } }
                            ]
                        },
                        orderBy: { createdAt: 'asc' },
                        include: {
                            Sender: { select: { id: true, name: true, role: true } },
                            Receiver: { select: { id: true, name: true, role: true } }
                        }
                    });
                }
                console.log(`[loadHistory] Found ${messages.length} messages.`);
                socket.emit('chatHistory', messages); // Надсилаємо історію назад клієнту
            } catch (error) {
                console.error("[loadHistory] Error loading history:", error);
                socket.emit('chatError', { message: 'Failed to load chat history' });
            }
        });

        /**
         * Обробник запиту списку чатів (тільки для Адмінів)
         * data: { searchTerm?: string }
         */
        if (socket.userRole === 'ADMIN') {
            socket.on('adminGetChatList', async (data) => {
                const { searchTerm } = data || {};
                const adminId = socket.userId;
                console.log(`[adminGetChatList] Admin ${adminId} requested chat list. SearchTerm: "${searchTerm}"`);
                try {
                    // Знаходимо всіх користувачів (не адмінів), які або писали будь-якому адміну,
                    // або отримували повідомлення від будь-якого адміна.
                    // Потім фільтруємо за searchTerm.
                    // Цей запит може бути складним, спробуємо знайти користувачів,
                    // які писали будь-якому адміну.
                    const usersList = await prisma.users.findMany({
                        where: {
                            role: { not: 'ADMIN' }, // Виключаємо адмінів зі списку
                            // Перевіряємо, чи існує хоча б одне повідомлення, де цей користувач є відправником,
                            // а отримувач - будь-хто з роллю ADMIN
                            SentMessages: {
                                some: {
                                    Receiver: { role: 'ADMIN' }
                                }
                            },
                            // Додаємо фільтр пошуку, якщо searchTerm надано
                            ...(searchTerm && {
                                OR: [
                                    { name: { contains: searchTerm, mode: 'insensitive' } },
                                    { email: { contains: searchTerm, mode: 'insensitive' } }
                                ]
                            })
                        },
                        select: { // Вибираємо тільки потрібні поля
                            id: true,
                            name: true,
                            email: true
                        },
                        // TODO: Додати сортування за останнім повідомленням
                    });

                    console.log(`[adminGetChatList] Found ${usersList.length} users who wrote to admins.`);

                    // TODO: Додати логіку для отримання статусу непрочитаних повідомлень для кожного чату

                    socket.emit('chatList', usersList); // Надсилаємо список користувачів адміну
                } catch (error) {
                    console.error("[adminGetChatList] Error fetching chat list:", error);
                    socket.emit('chatError', { message: 'Failed to fetch chat list' });
                }
            });
        }


        /**
         * Обробка відключення клієнта
         */
        socket.on('disconnect', (reason) => {
            console.log(`[Disconnect] User disconnected: ${socket.userId}. Reason: ${reason}`);
            // Видаляємо користувача або адміна зі списків підключених
            if (socket.userRole === 'ADMIN') {
                connectedAdmins.delete(socket.userId);
                console.log('[Disconnect] Current connected admins:', Array.from(connectedAdmins.keys()));
            } else {
                connectedUsers.delete(socket.userId);
                console.log('[Disconnect] Current connected users:', Array.from(connectedUsers.keys()));
            }
        });

    }); // кінець io.on('connection')
} // кінець export default initializeSocket