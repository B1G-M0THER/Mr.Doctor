<template>
  <div class="admin-chat-view">
    <div class="user-list-panel">
      <h2>Чати користувачів</h2>
      <input
          type="text"
          v-model="searchTerm"
          @input="searchUsers"
          placeholder="Пошук за іменем або email..."
      />
      <ul>
        <li
            v-for="user in users"
            :key="user.id"
            @click="selectUser(user.id)"
            :class="{ 'selected': user.id === selectedUserId }"
        >
          {{ user.name }}
        </li>
        <li v-if="users.length === 0 && !isLoading && !searchTerm">Немає активних чатів.</li>
        <li v-if="users.length === 0 && !isLoading && searchTerm">Користувачів не знайдено.</li>
        <li v-if="isLoading">Завантаження...</li>
      </ul>
    </div>

    <div class="chat-panel">
      <div v-if="!selectedUserId" class="no-chat-selected">
        Оберіть чат зі списку ліворуч.
      </div>
      <div v-else class="chat-container">
        <div class="chat-header">Чат з {{ selectedUserName }}
          <button @click="confirmDeleteChat" class="delete-chat-btn" title="Видалити цей чат">
            🗑️ Видалити
          </button>
        </div>

        <div class="chat-messages" ref="messageContainer">
          <template v-for="(msg, index) in messages" :key="msg.id">
            <div
                v-if="isNewDay(msg.createdAt, messages[index - 1]?.createdAt)"
                class="date-separator"
            >
              {{ formatDateSeparator(msg.createdAt) }}
            </div>
            <div class="message" :class="{ 'my-message': isMyMessage(msg.senderId) }">
              <span class="sender-name">
                {{ msg.Sender?.role === 'ADMIN' ? 'ADMIN' : msg.Sender?.name || 'Користувач' }}
              </span>
              <p class="message-content">{{ msg.content }}</p>
              <span class="timestamp">{{ formatTimestamp(msg.createdAt) }}</span>
            </div>
          </template>
          <div v-if="messages.length === 0 && selectedUserId">Повідомлень ще немає. Почніть розмову!</div>
        </div>
        <div class="chat-input">
          <input
              type="text"
              v-model="newMessage"
              @keyup.enter="sendMessageHandler"
              placeholder="Ваша відповідь..."
              :disabled="!selectedUserId"
          />
          <button @click="sendMessageHandler" :disabled="!selectedUserId || !newMessage.trim()">Надіслати</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useChatStore } from '../store/chatStore';
import { debounce } from 'lodash';

const chatStore = useChatStore();
const searchTerm = ref('');
const newMessage = ref('');
const messageContainer = ref(null);
const isLoading = ref(false);

const users = computed(() => chatStore.adminChatUserList);
const messages = computed(() => chatStore.currentChatMessages);
const selectedUserId = computed(() => chatStore.currentSelectedUserId);

const currentUserId = computed(() => parseInt(localStorage.getItem('userId'), 10));

const selectedUserName = computed(() => {
  const user = users.value.find(u => u.id === selectedUserId.value);
  return user ? user.name : 'Користувач';
});

const confirmDeleteChat = () => {
  if (!selectedUserId.value) return;
  const userName = selectedUserName.value || `користувачем ID ${selectedUserId.value}`;

  if (confirm(`Ви дійсно хочете видалити всю історію листування з ${userName}? Цю дію неможливо буде скасувати.`)) {
    console.log(`[AdminChatView] Deleting chat for user ${selectedUserId.value}`);
    chatStore.deleteChat(selectedUserId.value);
  }
};

const isMyMessage = (senderId) => {
  const currentId = currentUserId.value;
  console.log(`isMyMessage Check: senderId=${senderId} (type: ${typeof senderId}), currentUserId=${currentId} (type: ${typeof currentId})`);

  const result = senderId === currentId;
  console.log(`Comparison Result: ${result}`);

  return result;
};

const formatDateSeparator = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Місяці починаються з 0
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const isNewDay = (currentTimestamp, previousTimestamp) => {
  if (!previousTimestamp) {
    return true;
  }
  const currentDate = new Date(currentTimestamp);
  const previousDate = new Date(previousTimestamp);

  if (isNaN(currentDate.getTime()) || isNaN(previousDate.getTime())) {
    console.error("Invalid date detected in isNewDay:", currentTimestamp, previousTimestamp);
    return false;
  }

  return (
      currentDate.getFullYear() !== previousDate.getFullYear() ||
      currentDate.getMonth() !== previousDate.getMonth() ||
      currentDate.getDate() !== previousDate.getDate()
  );
};

const selectUser = (userId) => {
  console.log(`[AdminChatView] selectUser called with userId: ${userId}, type: ${typeof userId}`);
  if (selectedUserId.value !== userId) {
    chatStore.selectUserChat(userId);
    newMessage.value = '';
  } else {
    console.log(`[AdminChatView] User ${userId} is already selected.`);
  }
};

const sendMessageHandler = () => {
  if (newMessage.value.trim() && selectedUserId.value) {
    console.log(`[AdminChatView] Sending message to user ${selectedUserId.value}`);
    chatStore.sendMessage(selectedUserId.value, newMessage.value);
    newMessage.value = '';
  }
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const searchUsers = debounce(() => {
  console.log(`[AdminChatView] Searching users with term: "${searchTerm.value}"`);
  isLoading.value = true;
  chatStore.fetchChatList(searchTerm.value);
  setTimeout(() => isLoading.value = false, 500);
}, 300);

const scrollToBottom = async () => {
  await nextTick();
  const container = messageContainer.value;
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
};

watch(messages, () => {
  console.log('[AdminChatView] Messages updated, scrolling to bottom.');
  scrollToBottom();
}, { deep: true });

onMounted(() => {
  console.log('[AdminChatView] Component mounted.');
  isLoading.value = true;
  chatStore.fetchChatList();
  setTimeout(() => isLoading.value = false, 500);

});

</script>

<style scoped>

.date-separator {
  text-align: center;
  color: #a0a0a0;
  font-size: 0.85em;
  margin: 15px 0 10px 0;
  background-color: #2a2f33;
  padding: 3px 10px;
  border-radius: 10px;
  align-self: center;
  max-width: fit-content;
}

.no-messages-info {
  text-align: center;
  color: #777;
  margin-top: 20px;
  font-style: italic;
}

.admin-chat-view {
  display: flex;
  height: calc(100vh - 80px);
  background-color: #1e1e1e;
  color: #ffffff;
}

.user-list-panel {
  width: 300px;
  flex-shrink: 0;
  border-right: 1px solid #444;
  display: flex;
  flex-direction: column;
  background-color: #252526;
}

.user-list-panel h2 {
  padding: 15px;
  margin: 0;
  background-color: #333;
  border-bottom: 1px solid #444;
  font-size: 1.1em;
  text-align: center;
  flex-shrink: 0;
}

.user-list-panel input {
  margin: 10px;
  padding: 8px 12px;
  border: 1px solid #555;
  border-radius: 5px;
  background-color: #333;
  color: white;
  outline: none;
  font-size: 14px;
  flex-shrink: 0;
}
.user-list-panel input:focus {
  border-color: #42b983;
}

.user-list-panel ul {
  list-style: none;
  padding: 0;
  margin: 0;
  flex-grow: 1;
  overflow-y: auto;
}

.user-list-panel li {
  padding: 12px 15px;
  border-bottom: 1px solid #3a3a3a;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 0.95em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-list-panel li:hover {
  background-color: #3a3f44;
}

.user-list-panel li.selected {
  background-color: #42b983;
  color: white;
  font-weight: bold;
}

.chat-panel {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.no-chat-selected {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 1.2em;
  color: #777;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  padding: 15px;
  background-color: #333;
  border-bottom: 1px solid #444;
  font-weight: bold;
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.delete-chat-btn {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.85em;
  transition: background-color 0.2s ease;
}

.delete-chat-btn:hover {
  background-color: #c0392b;
}

.chat-messages {
  flex-grow: 1;
  padding: 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background-color: #1e1e1e;
}
.message {
  padding: 8px 12px;
  border-radius: 15px;
  max-width: 80%;
  word-wrap: break-word;
  background-color: #3a3f44;
  align-self: flex-start;
  color: #e0e0e0;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
.message.my-message {
  background-color: #42b983;
  align-self: flex-end;
  color: #ffffff;
}
.sender-name {
  font-size: 0.8em;
  font-weight: bold;
  display: block;
  margin-bottom: 4px;
  color: #bdbdbd;
}
.message.my-message .sender-name {
  color: #e0e0e0;
}
.message-content {
  margin: 0;
  font-size: 0.95em;
  line-height: 1.4;
}
.timestamp {
  font-size: 0.75em;
  color: #909090;
  display: block;
  text-align: right;
  margin-top: 5px;
}
.chat-input {
  display: flex;
  padding: 12px;
  border-top: 1px solid #444;
  background-color: #2c2f33;
  flex-shrink: 0;
}
.chat-input input {
  flex-grow: 1;
  padding: 10px 12px;
  border: 1px solid #555;
  border-radius: 20px;
  background-color: #333;
  color: white;
  margin-right: 10px;
  outline: none;
  font-size: 15px;
}
.chat-input input::placeholder { color: #888; }
.chat-input input:focus { border-color: #42b983; }
.chat-input button {
  padding: 10px 18px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-weight: bold;
}
.chat-input button:hover:not(:disabled) { background-color: #369966; }
.chat-input button:disabled {
  background-color: #555;
  cursor: not-allowed;
}

.user-list-panel ul::-webkit-scrollbar,
.chat-messages::-webkit-scrollbar {
  width: 8px;
}
.user-list-panel ul::-webkit-scrollbar-thumb,
.chat-messages::-webkit-scrollbar-thumb {
  background-color: #42b983;
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
.user-list-panel ul::-webkit-scrollbar-track { background-color: #252526; }
.chat-messages::-webkit-scrollbar-track { background-color: #1e1e1e; }

.user-list-panel ul,
.chat-messages {
  scrollbar-width: thin;
  scrollbar-color: #42b983 transparent;
}
</style>