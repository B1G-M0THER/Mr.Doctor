import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as socketService from '../services/socketService';

export const useChatStore = defineStore('chat', () => {
    const isChatOpen = ref(false);
    const messages = ref([]);
    const chatUsers = ref([]);
    const selectedUserId = ref(null);
    const hasUnreadMessages = ref(false);

    const currentChatMessages = computed(() => messages.value);
    const adminChatUserList = computed(() => chatUsers.value);
    const currentSelectedUserId = computed(() => selectedUserId.value);

    function toggleChat(open) {
        isChatOpen.value = typeof open === 'boolean' ? open : !isChatOpen.value;
        if (isChatOpen.value) {
            const userRole = localStorage.getItem('role');
            if (userRole !== 'ADMIN') {
                loadHistory(0);
                hasUnreadMessages.value = false;
            }
        }
    }

    function setupListeners() {
        const currentUserId = computed(() => parseInt(localStorage.getItem('userId'), 10));

        socketService.subscribeToChatDeleted(({ userId, count }) => {
            console.log(`[ChatStore] Received chatDeleted confirmation for userId: ${userId}. Count: ${count}`);
            if (selectedUserId.value === userId) {
                messages.value = [];
                selectedUserId.value = null;
            }
            fetchChatList();
        });

        socketService.subscribeToChatListUpdate(({ message }) => {
            console.log(`[ChatStore] Received chatListUpdate event: ${message}`);
            fetchChatList();
        });

        socketService.subscribeToMessages((message) => {
            console.log('[ChatStore] Received message:', message);
            const currentUserRole = localStorage.getItem('role');
            if (message.senderId !== currentUserId.value) {
                if (currentUserRole !== 'ADMIN') {
                    messages.value.push(message);
                    if (!isChatOpen.value) {
                        hasUnreadMessages.value = true;
                    }
                } else {
                    if (message.senderId === selectedUserId.value) {
                        messages.value.push(message);
                    } else {
                        console.log(`Received message from user ${message.senderId}, but currently viewing chat with ${selectedUserId.value}`);
                    }
                }
            } else {
                console.warn('[ChatStore] Ignored received message because senderId matches currentUserId.');
            }
        });

        socketService.subscribeToSentConfirmation((message) => {
            console.log('[ChatStore] Message sent confirmation:', message);
            if (!messages.value.some(m => m.id === message.id)) {
                messages.value.push(message);
            } else {
                console.warn(`[ChatStore] Message with ID ${message.id} already exists in the list.`);
            }
        });

        socketService.subscribeToHistory((history) => {
            console.log('[ChatStore] Received history:', history);
            messages.value = history;
        });

        socketService.subscribeToChatList((users) => {
            console.log('[ChatStore] Received chat list:', users);
            chatUsers.value = users;
        });

        socketService.subscribeToNewUserMessages(({ userId, userName }) => {
            console.log(`[ChatStore] Notification: New message from user ${userName} (ID: ${userId})`);
            const currentUserRole = localStorage.getItem('role');
            if(currentUserRole === 'ADMIN'){
                fetchChatList();
            }
        });
    }

    function connectSocket() {
        socketService.initiateSocketConnection();
        setupListeners();
    }

    function disconnectSocket() {
        socketService.disconnectSocket();
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
    }

    function loadHistory(targetId) {
        console.log(`[ChatStore] loadHistory action called for targetId: ${targetId}, type: ${typeof targetId}`);
        messages.value = [];
        if (typeof targetId === 'number' && targetId >= 0) {
            socketService.loadChatHistory({ userId: targetId });
        } else {
            console.error(`[ChatStore] Invalid targetId passed to loadHistory: ${targetId}`);
        }
    }

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
        loadHistory(userId);
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