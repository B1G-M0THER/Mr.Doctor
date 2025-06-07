import { io } from 'socket.io-client';
import { useChatStore } from '../store/chatStore.js';

let socket;

export const isSocketConnected = () => {
    return !!(socket && socket.connected);
};

export const initiateSocketConnection = () => {
    const token = localStorage.getItem('token');
    if (token && !socket?.connected) {
        console.log("Initiating socket connection...");
        socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000', {
            auth: {
                token: token
            }
        });

        const chatStore = useChatStore();
        chatStore.setupListeners();

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
        });

        socket.on('chatError', (error) => {
            console.error('Chat Error:', error.message);
            alert(`Chat Error: ${error.message}`);
        });

    } else if (!token) {
        console.log("No token found, socket not initiated.");
    }
};

export const adminDeleteChat = (userIdToDelete) => {
    console.log(`[SocketService] Emitting 'adminDeleteChat' for userId: ${userIdToDelete}`);
    emitEvent('adminDeleteChat', { userIdToDelete: userIdToDelete });
};

export const subscribeToChatDeleted = (callback) => {
    subscribeToEvent('chatDeleted', callback);
};

export const subscribeToChatListUpdate = (callback) => {
    subscribeToEvent('chatListUpdate', callback);
}

export const disconnectSocket = () => {
    if (socket) {
        console.log("Disconnecting socket...");
        socket.disconnect();
        socket = null;
    }
};

const emitEvent = (eventName, data) => {
    if (socket && socket.connected) {
        socket.emit(eventName, data);
    } else {
        console.error("Socket not connected or not initialized.");
    }
};

const subscribeToEvent = (eventName, callback) => {
    if (socket) {
        socket.off(eventName, callback);
        socket.on(eventName, callback);
    } else {
        console.error("Socket not initialized for subscription.");
    }
};

export const sendMessage = (receiverId, content) => {
    emitEvent('sendMessage', { receiverId, content });
};

export const loadChatHistory = (dataObject) => {
    console.log("[SocketService] Emitting 'loadHistory' with data:", dataObject);

    if (!dataObject || typeof dataObject.userId !== 'number' || dataObject.userId < 0) {
        console.error("[SocketService] Invalid dataObject passed to loadChatHistory:", dataObject);
        return;
    }
    emitEvent('loadHistory', dataObject);
};

export const adminGetChatList = (searchTerm = '') => {
    emitEvent('adminGetChatList', { searchTerm });
}

export const subscribeToMessages = (callback) => {
    subscribeToEvent('receiveMessage', callback);
};

export const subscribeToHistory = (callback) => {
    subscribeToEvent('chatHistory', callback);
};

export const subscribeToSentConfirmation = (callback) => {
    subscribeToEvent('messageSent', callback);
}

export const subscribeToChatList = (callback) => {
    subscribeToEvent('chatList', callback);
}
export const subscribeToNewUserMessages = (callback) => {
    subscribeToEvent('newUserMessage', callback);
}
