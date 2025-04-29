import { io } from 'socket.io-client';

let socket;

export const initiateSocketConnection = () => {
    const token = localStorage.getItem('token');
    if (token && !socket?.connected) { // Підключаємось тільки якщо є токен і ще не підключені
        console.log("Initiating socket connection...");
        // ВАЖЛИВО: Замініть URL на URL вашого бекенду
        socket = io('http://localhost:4000', {
            auth: {
                token: token
            }
        });

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
            // Можна додати логіку обробки помилки, наприклад, спробувати перепідключитись або повідомити користувача
        });

        // Глобальний обробник помилок чату
        socket.on('chatError', (error) => {
            console.error('Chat Error:', error.message);
            alert(`Chat Error: ${error.message}`); // Просте сповіщення
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

// Опціонально: Підписка на оновлення списку для інших адмінів
export const subscribeToChatListUpdate = (callback) => {
    subscribeToEvent('chatListUpdate', callback);
}

export const disconnectSocket = () => {
    if (socket) {
        console.log("Disconnecting socket...");
        socket.disconnect();
        socket = null; // Очищаємо змінну
    }
};

// Функція для надсилання події на сервер
const emitEvent = (eventName, data) => {
    if (socket && socket.connected) {
        socket.emit(eventName, data);
    } else {
        console.error("Socket not connected or not initialized.");
        // Можливо, спробувати перепідключитись initiateSocketConnection() ?
    }
};

// Функція для підписки на подію з сервера
const subscribeToEvent = (eventName, callback) => {
    if (socket) {
        // Видаляємо попередні слухачі, щоб уникнути дублювання
        socket.off(eventName, callback);
        // Додаємо нового слухача
        socket.on(eventName, callback);
    } else {
        console.error("Socket not initialized for subscription.");
    }
};


// Специфічні функції для чату
export const sendMessage = (receiverId, content) => {
    emitEvent('sendMessage', { receiverId, content });
};

export const loadChatHistory = (dataObject) => {
    // Додамо лог об'єкта, що надсилається
    console.log("[SocketService] Emitting 'loadHistory' with data:", dataObject);

    // Додаткова перевірка перед надсиланням
    if (!dataObject || typeof dataObject.userId !== 'number' || dataObject.userId < 0) { // userId має бути числом >= 0
        console.error("[SocketService] Invalid dataObject passed to loadChatHistory:", dataObject);
        // Можна не надсилати або повернути помилку
        return;
    }
    emitEvent('loadHistory', dataObject);
};

// --- Тільки для Адміна ---
export const adminGetChatList = (searchTerm = '') => {
    emitEvent('adminGetChatList', { searchTerm });
}

// Підписки
export const subscribeToMessages = (callback) => {
    subscribeToEvent('receiveMessage', callback);
};

export const subscribeToHistory = (callback) => {
    subscribeToEvent('chatHistory', callback);
};

export const subscribeToSentConfirmation = (callback) => {
    subscribeToEvent('messageSent', callback);
}

// --- Тільки для Адміна ---
export const subscribeToChatList = (callback) => {
    subscribeToEvent('chatList', callback);
}
export const subscribeToNewUserMessages = (callback) => {
    subscribeToEvent('newUserMessage', callback); // Слухати подію, що новий юзер написав
}

// Експортуємо сам екземпляр сокету, якщо потрібен прямий доступ (рідко)
// export { socket }; // Краще використовувати функції вище