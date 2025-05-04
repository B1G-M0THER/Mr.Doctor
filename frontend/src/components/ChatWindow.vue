<template>
  <div class="chat-window">
    <div class="chat-header">
      <span>Підтримка</span>
      <button class="close-btn" @click="closeChat">×</button>
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
                {{ msg.Sender?.role === 'ADMIN' ? 'ADMIN' : (isMyMessage(msg.senderId) ? 'Я' : msg.Sender?.name || 'Підтримка') }}
            </span>
          <p class="message-content">{{ msg.content }}</p>
          <span class="timestamp">{{ formatTimestamp(msg.createdAt) }}</span>
        </div>
      </template>
      <div v-if="messages.length === 0" class="no-messages-info">
        Повідомлень ще немає.
      </div>
    </div>
    <div class="chat-input">
      <input type="text" v-model="newMessage" @keyup.enter="sendMessageHandler" placeholder="Введіть ваше повідомлення..." />
      <button @click="sendMessageHandler" :disabled="!newMessage.trim()">Надіслати</button> </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useChatStore } from '../store/chatStore';

const chatStore = useChatStore();
const newMessage = ref('');
const messageContainer = ref(null);

const currentUserId = computed(() => parseInt(localStorage.getItem('userId'), 10));

const messages = computed(() => chatStore.currentChatMessages);

const isMyMessage = (senderId) => {
  const currentId = currentUserId.value;
  console.log(`isMyMessage Check: senderId=${senderId} (type: ${typeof senderId}), currentUserId=${currentId} (type: ${typeof currentId})`);

  const result = senderId === currentId;
  console.log(`Comparison Result: ${result}`);

  return result;
};

const closeChat = () => {
  chatStore.toggleChat(false);
};

const sendMessageHandler = () => {
  if (newMessage.value.trim()) {
    chatStore.sendMessage(0, newMessage.value);
    newMessage.value = '';
  }
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDateSeparator = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
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

const scrollToBottom = async () => {
  await nextTick();
  const container = messageContainer.value;
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
};


watch(messages, () => {
  scrollToBottom();
}, { deep: true });

onMounted(() => {
  scrollToBottom();
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

.chat-window {
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 450px;
  height: 600px;
  background-color: #2c2f33;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  z-index: 1001;
  color: #ffffff;
  border: 1px solid #444;
  overflow: hidden;
}

.chat-header {
  background-color: #42b983;
  padding: 10px 15px;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  flex-shrink: 0;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 0 5px;
}
.close-btn:hover {
  opacity: 0.8;
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
  color: #ffffff;
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
.chat-input input::placeholder {
  color: #888;
}
.chat-input input:focus {
  border-color: #42b983;
}

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

.chat-input button:hover {
  background-color: #369966;
}

.chat-messages::-webkit-scrollbar {
  width: 8px;
}
.chat-messages::-webkit-scrollbar-thumb {
  background-color: #42b983;
  border-radius: 4px;
  border: 2px solid #1e1e1e;
}
.chat-messages::-webkit-scrollbar-track {
  background-color: #1e1e1e;
}
.chat-messages {
  scrollbar-width: thin;
  scrollbar-color: #42b983 #1e1e1e;
}
</style>