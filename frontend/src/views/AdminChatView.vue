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
          <div v-for="msg in messages" :key="msg.id" class="message" :class="{ 'my-message': isMyMessage(msg.senderId) }">
            <span class="sender-name">
              {{ msg.Sender?.role === 'ADMIN' ? 'ADMIN' : msg.Sender?.name || 'Користувач' }}
            </span>
            <p class="message-content">{{ msg.content }}</p>
            <span class="timestamp">{{ formatTimestamp(msg.createdAt) }}</span>
          </div>
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
import { useChatStore } from '../store/chatStore'; // Перевірте шлях до стору
import { debounce } from 'lodash'; // Імпорт debounce з lodash

// Ініціалізація стору та локальних змінних
const chatStore = useChatStore();
const searchTerm = ref(''); // Для поля пошуку
const newMessage = ref(''); // Для поля вводу нового повідомлення
const messageContainer = ref(null); // Ref для доступу до DOM елемента повідомлень (для прокрутки)
const isLoading = ref(false); // Прапорець стану завантаження списку користувачів

// Отримання даних зі стору через computed properties
const users = computed(() => chatStore.adminChatUserList); // Список користувачів для адміна
const messages = computed(() => chatStore.currentChatMessages); // Повідомлення поточного вибраного чату
const selectedUserId = computed(() => chatStore.currentSelectedUserId); // ID вибраного користувача

// ID поточного адміна з localStorage
const currentUserId = computed(() => parseInt(localStorage.getItem('userId'), 10));

// Обчислення імені вибраного користувача для заголовку чату
const selectedUserName = computed(() => {
  const user = users.value.find(u => u.id === selectedUserId.value);
  return user ? user.name : 'Користувач'; // Повертаємо ім'я або 'Користувач', якщо не знайдено
});

const confirmDeleteChat = () => {
  if (!selectedUserId.value) return; // Перевірка, чи користувач вибраний

  const userName = selectedUserName.value || `користувачем ID ${selectedUserId.value}`;
  // Запитуємо підтвердження у адміна
  if (confirm(`Ви дійсно хочете видалити всю історію листування з ${userName}? Цю дію неможливо буде скасувати.`)) {
    console.log(`[AdminChatView] Deleting chat for user ${selectedUserId.value}`);
    // Викликаємо дію стору для видалення
    chatStore.deleteChat(selectedUserId.value);
  }
};

// Функція перевірки, чи є повідомлення "моїм" (надісланим поточним адміном)
const isMyMessage = (senderId) => {
  // Отримуємо поточне значення computed property
  const currentId = currentUserId.value;

  // Виводимо значення та їх типи в консоль
  console.log(`isMyMessage Check: senderId=${senderId} (type: ${typeof senderId}), currentUserId=${currentId} (type: ${typeof currentId})`);

  // Виконуємо порівняння
  const result = senderId === currentId;

  // Виводимо результат порівняння
  console.log(`Comparison Result: ${result}`);

  return result;
};

// Функція вибору користувача зі списку
const selectUser = (userId) => {
  // Додамо лог тут, щоб побачити, що передається
  console.log(`[AdminChatView] selectUser called with userId: ${userId}, type: ${typeof userId}`);
  if (selectedUserId.value !== userId) {
    chatStore.selectUserChat(userId);
    newMessage.value = '';
  } else {
    console.log(`[AdminChatView] User ${userId} is already selected.`);
  }
};

// Функція надсилання повідомлення
const sendMessageHandler = () => {
  // Надсилаємо, тільки якщо є текст, і користувач вибраний
  if (newMessage.value.trim() && selectedUserId.value) {
    console.log(`[AdminChatView] Sending message to user ${selectedUserId.value}`);
    // Адмін надсилає повідомлення вибраному користувачу
    chatStore.sendMessage(selectedUserId.value, newMessage.value);
    newMessage.value = ''; // Очищаємо поле вводу
  }
};

// Функція форматування часу
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Обробник пошуку з debounce (щоб запити не надсилались на кожне натискання клавіші)
const searchUsers = debounce(() => {
  console.log(`[AdminChatView] Searching users with term: "${searchTerm.value}"`);
  isLoading.value = true;
  chatStore.fetchChatList(searchTerm.value); // Викликаємо дію стору для оновлення списку
  // TODO: Реалізувати більш надійне керування isLoading через стор або події
  setTimeout(() => isLoading.value = false, 500); // Тимчасовий фікс для відображення завантаження
}, 300); // Затримка 300 мс

// --- Логіка автоматичної прокрутки ---
const scrollToBottom = async () => {
  await nextTick(); // Чекаємо оновлення DOM
  const container = messageContainer.value;
  if (container) {
    container.scrollTop = container.scrollHeight; // Прокручуємо до кінця
  }
};

// Стежимо за змінами у масиві повідомлень активного чату
watch(messages, () => {
  console.log('[AdminChatView] Messages updated, scrolling to bottom.');
  scrollToBottom(); // Прокручуємо вниз при додаванні нових повідомлень
}, { deep: true }); // deep: true для відстеження змін всередині масиву

// Дії при монтуванні компонента
onMounted(() => {
  console.log('[AdminChatView] Component mounted.');
  isLoading.value = true;
  chatStore.fetchChatList(); // Завантажуємо початковий список користувачів
  // TODO: Покращити керування isLoading
  setTimeout(() => isLoading.value = false, 500);

  // Переконуємося, що слухачі подій Socket.IO налаштовані
  // Це має відбуватися при підключенні сокета (в Header.vue або App.vue)
  // Якщо є сумніви, можна викликати тут, але обережно, щоб не дублювати слухачів
  // chatStore.setupListeners();
});

</script>

<style scoped>
.admin-chat-view {
  display: flex;
  height: calc(100vh - 80px); /* Розрахунок висоти відносно хедера (припускаємо висоту хедера 80px) */
  background-color: #1e1e1e;
  color: #ffffff;
}

/* --- Панель списку користувачів --- */
.user-list-panel {
  width: 300px; /* Фіксована ширина */
  flex-shrink: 0; /* Не стискати панель */
  border-right: 1px solid #444;
  display: flex;
  flex-direction: column;
  background-color: #252526; /* Трохи світліший фон */
}

.user-list-panel h2 {
  padding: 15px;
  margin: 0;
  background-color: #333; /* Фон заголовку */
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
  flex-grow: 1; /* Займає доступний простір */
  overflow-y: auto; /* Додає прокрутку */
}

.user-list-panel li {
  padding: 12px 15px;
  border-bottom: 1px solid #3a3a3a;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 0.95em;
  white-space: nowrap; /* Заборона переносу тексту */
  overflow: hidden; /* Приховування тексту, що не вміщується */
  text-overflow: ellipsis; /* Додавання трикрапки */
}
/* Стиль для елементів списку при наведенні */
.user-list-panel li:hover {
  background-color: #3a3f44;
}
/* Стиль для вибраного елемента */
.user-list-panel li.selected {
  background-color: #42b983;
  color: white;
  font-weight: bold;
}
/* --- Панель активного чату --- */
.chat-panel {
  flex-grow: 1; /* Займає решту простору */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Важливо, щоб внутрішні елементи не виходили за межі */
}

/* Повідомлення, коли чат не вибрано */
.no-chat-selected {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 1.2em;
  color: #777;
}

/* Контейнер для активного чату (хедер, повідомлення, інпут) */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%; /* Займає всю висоту панелі чату */
}

/* Хедер активного чату */
.chat-header {
  padding: 15px;
  background-color: #333;
  border-bottom: 1px solid #444;
  font-weight: bold;
  flex-shrink: 0;
  display: flex; /* Додано для позиціонування кнопки */
  justify-content: space-between; /* Розмістити назву та кнопку по краях */
  align-items: center; /* Вирівняти по вертикалі */
}

/* Стилі для кнопки видалення */
.delete-chat-btn {
  background-color: #e74c3c; /* Червоний колір */
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.85em; /* Трохи менший шрифт */
  transition: background-color 0.2s ease;
}

.delete-chat-btn:hover {
  background-color: #c0392b; /* Темніший червоний при наведенні */
}

/* --- Стилі для Повідомлень та Поля Вводу (ідентичні ChatWindow.vue) --- */
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
  background-color: #3a3f44; /* Фон для повідомлень користувача (отриманих адміном) */
  align-self: flex-start;
  color: #e0e0e0;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
.message.my-message {
  /* ЗМІНЕНО: background-color на зелений */
  background-color: #42b983; /* Фон для повідомлень адміна ("моїх") */
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
  /* Ім'я адміна показуємо як 'ADMIN' */
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
  flex-shrink: 0; /* Не стискати інпут */
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

/* --- Стилізація скролбарів (ідентична ChatWindow.vue) --- */
.user-list-panel ul::-webkit-scrollbar,
.chat-messages::-webkit-scrollbar {
  width: 8px;
}
.user-list-panel ul::-webkit-scrollbar-thumb,
.chat-messages::-webkit-scrollbar-thumb {
  background-color: #42b983;
  border-radius: 4px;
  border: 2px solid transparent; /* Або колір фону */
  background-clip: padding-box;
}
.user-list-panel ul::-webkit-scrollbar-track { background-color: #252526; }
.chat-messages::-webkit-scrollbar-track { background-color: #1e1e1e; }

.user-list-panel ul,
.chat-messages {
  scrollbar-width: thin;
  scrollbar-color: #42b983 transparent; /* Або колір фону */
}
</style>