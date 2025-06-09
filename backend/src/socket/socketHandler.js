import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

const connectedUsers = new Map();
const connectedAdmins = new Map();

const SECRET_KEY = process.env.SECRET_KEY;

export default function initializeSocket(io) {

    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            console.error('[Socket Auth] Error: Token not provided.');
            return next(new Error("Authentication error: Token not provided"));
        }
        try {
            const decoded = jwt.verify(token, SECRET_KEY);
            socket.userId = decoded.id;
            socket.userRole = decoded.role;
            console.log(`[Socket Auth] Success: User ${decoded.id}, Role ${decoded.role}`);
            next();
        } catch (err) {
            console.error('[Socket Auth] Error: Invalid token.', err.message);
            next(new Error("Authentication error: Invalid token"));
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Connection] User connected: ${socket.userId} with role ${socket.userRole}, socket ID: ${socket.id}`);

        if (socket.userRole === 'ADMIN') {
            connectedAdmins.set(socket.userId, socket.id);
            console.log('[Connection] Current connected admins:', Array.from(connectedAdmins.keys()));
        } else {
            connectedUsers.set(socket.userId, socket.id);
            console.log('[Connection] Current connected users:', Array.from(connectedUsers.keys()));
        }

        if (socket.userRole === 'ADMIN') {
            socket.on('adminDeleteChat', async (data) => {
                const { userIdToDelete } = data || {};
                const adminId = socket.userId;

                console.log(`[adminDeleteChat] Request received: adminId=${adminId}, userIdToDelete=${userIdToDelete}`);

                if (!userIdToDelete || typeof userIdToDelete !== 'number' || userIdToDelete <= 0) {
                    console.error("[adminDeleteChat] Invalid userIdToDelete received:", userIdToDelete);
                    return socket.emit('chatError', { message: 'Invalid user ID specified for deletion.' });
                }

                try {
                    console.log(`[adminDeleteChat] Attempting to delete messages between any admin and user ${userIdToDelete}`);

                    const deleteResult = await prisma.chatMessage.deleteMany({
                        where: {
                            OR: [
                                { senderId: userIdToDelete, Receiver: { role: 'ADMIN' } },
                                { receiverId: userIdToDelete, Sender: { role: 'ADMIN' } }
                            ]
                        }
                    });

                    console.log(`[adminDeleteChat] Deleted ${deleteResult.count} messages for user ${userIdToDelete}.`);
                    socket.emit('chatDeleted', { userId: userIdToDelete, count: deleteResult.count });

                    const allAdminSocketIds = Array.from(connectedAdmins.values()).filter(id => id !== socket.id);
                    if (allAdminSocketIds.length > 0) {
                        io.to(allAdminSocketIds).emit('chatListUpdate', { message: `Chat with user ${userIdToDelete} deleted by admin ${adminId}.` });
                    }

                } catch (error) {
                    console.error(`[adminDeleteChat] Error deleting chat for user ${userIdToDelete}:`, error);
                    socket.emit('chatError', { message: `Failed to delete chat history for user ${userIdToDelete}.` });
                }
            });

            socket.on('adminGetChatList', async (data) => {
                const searchTerm = data?.searchTerm || '';
                const adminId = socket.userId;
                console.log(`[adminGetChatList] Admin ${adminId} requested chat list. SearchTerm: "${searchTerm}"`);

                try {
                    let whereCondition = {
                        role: { not: 'ADMIN' },
                        OR: [
                            { SentMessages: { some: { Receiver: { role: 'ADMIN' } } } },
                            { ReceivedMessages: { some: { Sender: { role: 'ADMIN' } } } }
                        ]
                    };

                    if (searchTerm) {
                        whereCondition.AND = [
                            {
                                OR: [
                                    { name: { contains: searchTerm } },
                                    { email: { contains: searchTerm } }
                                ]
                            }
                        ];
                    }

                    const usersList = await prisma.users.findMany({
                        where: whereCondition,
                        select: { id: true, name: true, email: true},
                        orderBy: { name: 'asc' }
                    });

                    console.log(`[adminGetChatList] Found ${usersList.length} users matching criteria.`);
                    socket.emit('chatList', usersList);

                } catch (error) {
                    console.error("[adminGetChatList] Error fetching chat list:", error);

                    if (error.code === 'P2009' || error.message.includes("Unknown argument `mode`")) {
                        console.error("Validation error still present?", error);
                        socket.emit('chatError', { message: 'Query validation error persists.' });
                    } else {
                        socket.emit('chatError', { message: 'Failed to fetch chat list' });
                    }
                }
            });
        }

        socket.on('sendMessage', async (data) => {
            const senderId = socket.userId;
            const senderRole = socket.userRole;
            let { receiverId, content } = data || {};

            console.log(`[sendMessage] Received: senderId=${senderId}, senderRole=${senderRole}, intendedReceiverId=${receiverId}, content="${content}"`);

            if (!content || content.trim() === "") {
                console.log('[sendMessage] Error: Empty content.');
                socket.emit('chatError', { message: 'Cannot send empty message.' });
                return;
            }

            let actualReceiverId;
            let targetSocketId = null;

            try {
                if (senderRole === 'ADMIN') {
                    if (!receiverId || typeof receiverId !== 'number' || receiverId <= 0) {
                        console.error('[sendMessage] Error: Admin must specify a valid receiver user ID.');
                        return socket.emit('chatError', { message: 'Admin must specify recipient user ID.' });
                    }
                    actualReceiverId = receiverId;
                    targetSocketId = connectedUsers.get(actualReceiverId);
                    console.log(`[sendMessage] Admin ${senderId} sending to User ${actualReceiverId}. Target socket: ${targetSocketId}`);
                } else {
                    const onlineAdminIds = Array.from(connectedAdmins.keys());
                    if (onlineAdminIds.length > 0) {
                        actualReceiverId = onlineAdminIds[0];
                        targetSocketId = connectedAdmins.get(actualReceiverId);
                        console.log(`[sendMessage] Client ${senderId} sending to first online Admin ${actualReceiverId}. Target socket: ${targetSocketId}`);
                    } else {
                        console.log(`[sendMessage] No admins online. Searching DB for any admin...`);
                        const anyAdmin = await prisma.users.findFirst({
                            where: { role: 'ADMIN' },
                            select: { id: true }
                        });
                        if (anyAdmin) {
                            actualReceiverId = anyAdmin.id;
                            targetSocketId = null;
                            console.log(`[sendMessage] Found admin in DB (offline): ${actualReceiverId}. Message will be saved.`);
                        } else {
                            console.error('[sendMessage] Error: No Admin user found in the database.');
                            return socket.emit('chatError', { message: 'Support is currently unavailable. No admin accounts found.' });
                        }
                    }
                }

                if (typeof actualReceiverId !== 'number' || actualReceiverId <= 0) {
                    console.error('[sendMessage] Error: Could not determine actualReceiverId.');
                    return socket.emit('chatError', { message: 'Failed to determine message recipient.' });
                }

                const messageData = { senderId, receiverId: actualReceiverId, content };
                console.log('[sendMessage] Attempting to save message with data:', messageData);

                const message = await prisma.chatMessage.create({
                    data: messageData,
                    include: {
                        Sender: { select: { id: true, name: true, role: true } },
                        Receiver: { select: { id: true, name: true, role: true } }
                    }
                });
                console.log('[sendMessage] Message saved successfully to DB. ID:', message.id);

                if (targetSocketId) {
                    console.log(`[sendMessage] Emitting 'receiveMessage' to target socket ${targetSocketId}`);
                    io.to(targetSocketId).emit('receiveMessage', message);

                    if (senderRole !== 'ADMIN') {
                        const allAdminSocketIds = Array.from(connectedAdmins.values());
                        if (allAdminSocketIds.length > 0) {
                            console.log(`[sendMessage] Emitting 'newUserMessage' for user ${senderId} to all admin sockets: ${allAdminSocketIds.join(',')}`);
                            io.to(allAdminSocketIds).emit('newUserMessage', { userId: senderId, userName: message.Sender.name });
                        }
                    }
                } else {
                    console.log(`[sendMessage] Target user/admin ${actualReceiverId} is not connected. Message saved only.`);
                }

                socket.emit('messageSent', message);
                console.log(`[sendMessage] Emitted 'messageSent' confirmation back to sender socket ${socket.id}`);

            } catch (error) {
                console.error("[sendMessage] CRITICAL ERROR:", error);
                socket.emit('chatError', { message: 'Failed to process message on server. Check server logs for details.' });
            }
        });

        socket.on('loadHistory', async (data) => {
            const { userId } = data || {};
            const currentUserId = socket.userId;
            const currentUserRole = socket.userRole;

            console.log(`[loadHistory] Request received: requesterId=${currentUserId}, requesterRole=${currentUserRole}, targetUserId=${userId}`);

            try {
                let messages;
                if (currentUserRole === 'ADMIN') {
                    if (!userId || typeof userId !== 'number' || userId <= 0) {
                        console.error("[loadHistory] Admin requested history without a valid target userId.");
                        return socket.emit('chatError', { message: 'Please select a user chat to load history.' });
                    }
                    console.log(`[loadHistory] Admin ${currentUserId} loading chat history with user ${userId}`);
                    messages = await prisma.chatMessage.findMany({
                        where: { OR: [ { senderId: currentUserId, receiverId: userId }, { senderId: userId, receiverId: currentUserId } ] },
                        orderBy: { createdAt: 'asc' },
                        include: { Sender: { select: { id: true, name: true, role: true } }, Receiver: { select: { id: true, name: true, role: true } } }
                    });
                } else {
                    console.log(`[loadHistory] Client ${currentUserId} loading chat history with admins`);
                    messages = await prisma.chatMessage.findMany({
                        where: { OR: [ { senderId: currentUserId, Receiver: { role: 'ADMIN' } }, { receiverId: currentUserId, Sender: { role: 'ADMIN' } } ] },
                        orderBy: { createdAt: 'asc' },
                        include: { Sender: { select: { id: true, name: true, role: true } }, Receiver: { select: { id: true, name: true, role: true } } }
                    });
                }
                console.log(`[loadHistory] Found ${messages.length} messages.`);
                socket.emit('chatHistory', messages);
            } catch (error) {
                console.error("[loadHistory] Error loading history:", error);
                socket.emit('chatError', { message: 'Failed to load chat history' });
            }
        });

        socket.on('disconnect', (reason) => {
            console.log(`[Disconnect] User disconnected: ${socket.userId}. Reason: ${reason}`);
            if (socket.userRole === 'ADMIN') {
                connectedAdmins.delete(socket.userId);
                console.log('[Disconnect] Current connected admins:', Array.from(connectedAdmins.keys()));
            } else {
                connectedUsers.delete(socket.userId);
                console.log('[Disconnect] Current connected users:', Array.from(connectedUsers.keys()));
            }
        });

    });
}