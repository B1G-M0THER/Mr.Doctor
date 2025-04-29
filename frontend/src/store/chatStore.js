import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as socketService from '../services/socketService';

export const useChatStore = defineStore('chat', () => {
    // --- State ---
    const isChatOpen = ref(false);
    const messages = ref([]); // Повідомлення поточного активного чату
    const chatUsers = ref([]); // Список користувачів для адміна
    const selectedUserId = ref(null); // ID користувача, вибраного адміном
    const hasUnreadMessages = ref(false); // Індикатор нових повідомлень для клієнта

    // --- Getters ---
    const currentChatMessages = computed(() => messages.value);
    const adminChatUserList = computed(() => chatUsers.value);
    const currentSelectedUserId = computed(() => selectedUserId.value);

    // --- Actions ---
    function toggleChat(open) {
        isChatOpen.value = typeof open === 'boolean' ? open : !isChatOpen.value;
        if (isChatOpen.value) {
            // При відкритті чату клієнтом, завантажуємо історію (з ID = 0 - умовний ID адмінів)
            // Якщо це адмін відкриває чат користувача, історія завантажується при виборі користувача
            const userRole = localStorage.getItem('role');
            if (userRole !== 'ADMIN') {
                loadHistory(0); // Клієнт завантажує свій чат з адмінами
                hasUnreadMessages.value = false; // Скидаємо індикатор при відкритті
            }
        }
    }

    function setupListeners() {
        const currentUserId = computed(() => parseInt(localStorage.getItem('userId'), 10));

        socketService.subscribeToChatDeleted(({ userId, count }) => {
            console.log(`[ChatStore] Received chatDeleted confirmation for userId: ${userId}. Count: ${count}`);
            // Якщо видалено чат, який зараз вибраний
            if (selectedUserId.value === userId) {
                messages.value = []; // Очищуємо повідомлення
                selectedUserId.value = null; // Знімаємо виділення з користувача
            }
            // Оновлюємо список користувачів (видалений користувач зникне, якщо в нього не залишилось повідомлень)
            fetchChatList();
        });

        // Опціонально: обробка оновлення списку для інших адмінів
        socketService.subscribeToChatListUpdate(({ message }) => {
            console.log(`[ChatStore] Received chatListUpdate event: ${message}`);
            // Просто оновлюємо список
            fetchChatList();
        });

        // Слухаємо НОВІ ВХІДНІ повідомлення (від ІНШОГО користувача/адміна)
        socketService.subscribeToMessages((message) => {
            console.log('[ChatStore] Received message:', message);
            const currentUserRole = localStorage.getItem('role');

            // Додаємо тільки якщо відправник НЕ поточний користувач
            if (message.senderId !== currentUserId.value) {
                // Перевіряємо контекст чату
                if (currentUserRole !== 'ADMIN') { // Якщо ми Клієнт
                    // Додаємо, бо це повідомлення від адміна
                    messages.value.push(message);
                    if (!isChatOpen.value) {
                        hasUnreadMessages.value = true;
                    }
                } else { // Якщо ми Адмін
                    // Додаємо, тільки якщо це повідомлення від вибраного зараз користувача
                    if (message.senderId === selectedUserId.value) {
                        messages.value.push(message);
                    } else {
                        // Повідомлення від іншого користувача, не вибраного зараз
                        // TODO: Можна показати сповіщення або позначити користувача в списку
                        console.log(`Received message from user ${message.senderId}, but currently viewing chat with ${selectedUserId.value}`);
                    }
                }
            } else {
                // Це повідомлення від нас самих, яке прийшло через receiveMessage?
                // Такого не має бути при правильній логіці на бекенді. Ігноруємо.
                console.warn('[ChatStore] Ignored received message because senderId matches currentUserId.');
            }
        });

        // Слухаємо ПІДТВЕРДЖЕННЯ НАШОГО ВІДПРАВЛЕНОГО повідомлення
        socketService.subscribeToSentConfirmation((message) => {
            console.log('[ChatStore] Message sent confirmation:', message);
            // Перевіряємо, чи повідомлення з таким ID ще не існує в масиві
            // (на випадок дуже швидкого отримання або інших проблем)
            if (!messages.value.some(m => m.id === message.id)) {
                messages.value.push(message);
            } else {
                console.warn(`[ChatStore] Message with ID ${message.id} already exists in the list.`);
                // Можливо, оновити існуюче повідомлення, якщо потрібно
                // const index = messages.value.findIndex(m => m.id === message.id);
                // if (index !== -1) messages.value[index] = message;
            }
        });

        // Слухаємо завантажену історію (без змін)
        socketService.subscribeToHistory((history) => {
            console.log('[ChatStore] Received history:', history);
            messages.value = history;
        });

        // --- Тільки для Адміна ---
        socketService.subscribeToChatList((users) => {
            console.log('[ChatStore] Received chat list:', users);
            chatUsers.value = users;
        });

        // Слухаємо сповіщення про НОВЕ ПОВІДОМЛЕННЯ від користувача (для оновлення списку адміна)
        socketService.subscribeToNewUserMessages(({ userId, userName }) => {
            console.log(`[ChatStore] Notification: New message from user ${userName} (ID: ${userId})`);
            // Оновлюємо список користувачів, можливо, позначивши цього користувача
            // Найпростіше - перезавантажити список
            const currentUserRole = localStorage.getItem('role');
            if(currentUserRole === 'ADMIN'){
                fetchChatList(); // Перезапитуємо список
                // TODO: Додати візуальну індикацію для адміна про новий чат/повідомлення
            }
        });
    }

    function connectSocket() {
        socketService.initiateSocketConnection();
        setupListeners(); // Налаштовуємо слухачів після ініціалізації
    }

    function disconnectSocket() {
        socketService.disconnectSocket();
        // Очистити стан при виході?
        isChatOpen.value = false;
        messages.value = [];
        chatUsers.value = [];
        selectedUserId.value = null;
        hasUnreadMessages.value = false;
    }

    function sendMessage(receiverId, content) {
        if (!content.trim()) return;
        console.log(`[ChatStore] Sending message to ${receiverId}: "${content}"`);
        socketService.sendMessage(receiverId, content);
        // ПРИБРАНО ОПТИМІСТИЧНЕ ОНОВЛЕННЯ - покладаємось тільки на 'messageSent'
    }

    function loadHistory(targetId) { // Назвемо аргумент targetId для ясності
        // Додамо лог
        console.log(`[ChatStore] loadHistory action called for targetId: ${targetId}, type: ${typeof targetId}`);
        messages.value = []; // Очищуємо попередню історію
        // Переконуємось, що надсилаємо об'єкт з ключем 'userId' і числовим значенням
        if (typeof targetId === 'number' && targetId >= 0) { // Додамо перевірку типу тут (0 дозволено для клієнта)
            socketService.loadChatHistory({ userId: targetId });
        } else {
            console.error(`[ChatStore] Invalid targetId passed to loadHistory: ${targetId}`);
            // Можна не надсилати запит або показати помилку користувачу
        }
    }

    // --- Тільки для Адміна ---
    function fetchChatList(searchTerm = '') {
        socketService.adminGetChatList(searchTerm);
    }

    function deleteChat(userIdToDelete) {
        if (!userIdToDelete) {
            console.error("[ChatStore] deleteChat called without userIdToDelete.");
            return;
        }
        console.log(`[ChatStore] Initiating chat deletion for userId: ${userIdToDelete}`);
        socketService.adminDeleteChat(userIdToDelete);
    }

    function selectUserChat(userId) {
        // Додамо лог
        console.log(`[ChatStore] selectUserChat action called with userId: ${userId}, type: ${typeof userId}`);
        selectedUserId.value = userId;
        loadHistory(userId); // Викликаємо loadHistory з отриманим ID
    }


    return {
        isChatOpen,
        messages,
        chatUsers,
        selectedUserId,
        hasUnreadMessages,
        currentChatMessages,
        adminChatUserList,
        currentSelectedUserId,
        toggleChat,
        connectSocket,
        disconnectSocket,
        sendMessage,
        loadHistory,
        fetchChatList,
        selectUserChat,
        setupListeners,
        deleteChat
    };
});