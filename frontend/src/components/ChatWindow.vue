<template>
  <div class="chat-window">
    <div class="chat-header">
      <span>Підтримка</span>
      <button class="close-btn" @click="closeChat">×</button>
    </div>
    <div class="chat-messages" ref="messageContainer">
      <div v-for="msg in messages" :key="msg.id" class="message" :class="{ 'my-message': isMyMessage(msg.senderId) }">
        <span class="sender-name">
            {{ msg.Sender?.role === 'ADMIN' ? 'ADMIN' : (isMyMessage(msg.senderId) ? 'Я' : msg.Sender?.name || 'Підтримка') }}
        </span>
        <p class="message-content">{{ msg.content }}</p>
        <span class="timestamp">{{ formatTimestamp(msg.createdAt) }}</span>
      </div>
    </div>
    <div class="chat-input">
      <input type="text" v-model="newMessage" @keyup.enter="sendMessageHandler" placeholder="Введіть ваше повідомлення..." />
      <button @click="sendMessageHandler">Надіслати</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useChatStore } from '../store/chatStore'; // Переконайтесь, що шлях правильний

const chatStore = useChatStore();
const newMessage = ref('');
const messageContainer = ref(null); // Ref для контейнера повідомлень для прокрутки

// Отримуємо ID поточного користувача з localStorage
const currentUserId = computed(() => parseInt(localStorage.getItem('userId'), 10));

// Отримуємо масив повідомлень з chatStore
const messages = computed(() => chatStore.currentChatMessages);

// Функція для визначення, чи є повідомлення "моїм" (від поточного користувача)
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

// Функція для закриття вікна чату (викликає дію в сторі)
const closeChat = () => {
  chatStore.toggleChat(false);
};

// Функція для надсилання нового повідомлення
const sendMessageHandler = () => {
  // Перевіряємо, чи повідомлення не порожнє (після видалення пробілів)
  if (newMessage.value.trim()) {
    // Клієнт завжди надсилає повідомлення до групи адмінів (бекенд визначить конкретного)
    // Передаємо 0 як умовний ID отримувача-адміна
    chatStore.sendMessage(0, newMessage.value);
    newMessage.value = ''; // Очищуємо поле вводу після надсилання
  }
};

// Функція для форматування часу повідомлення
const formatTimestamp = (timestamp) => {
  if (!timestamp) return ''; // Повертаємо порожній рядок, якщо час не визначено
  const date = new Date(timestamp);
  // Форматуємо час у години:хвилини (наприклад, "14:32")
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// --- Логіка для автоматичної прокрутки чату донизу ---

// Функція для прокрутки контейнера повідомлень до останнього повідомлення
const scrollToBottom = async () => {
  // nextTick чекає, доки Vue оновить DOM після зміни даних (наприклад, додавання нового повідомлення)
  await nextTick();
  const container = messageContainer.value;
  // Якщо контейнер існує, встановлюємо його scrollTop на повну висоту прокрутки
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
};

// Стежимо за змінами у масиві повідомлень
watch(messages, () => {
  // При будь-якій зміні (додавання нового повідомлення) викликаємо прокрутку
  scrollToBottom();
}, { deep: true }); // deep: true необхідно для відстеження змін всередині масиву об'єктів

// Прокручуємо вниз один раз при монтуванні компонента (коли завантажується історія)
onMounted(() => {
  // Завантаження історії тепер відбувається при відкритті вікна (в toggleChat у сторі)
  // Тому тут просто прокручуємо донизу після початкового рендеру
  scrollToBottom();
});

</script>

<style scoped>
.chat-window {
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 450px; /* Ширина вікна чату */
  height: 600px; /* Висота вікна чату */
  background-color: #2c2f33; /* Колір фону вікна */
  border-radius: 10px; /* Закруглені кути */
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3); /* Тінь */
  display: flex;
  flex-direction: column; /* Елементи розташовуються вертикально */
  z-index: 1001; /* Щоб було поверх інших елементів */
  color: #ffffff; /* Колір тексту */
  border: 1px solid #444; /* Тонка рамка */
  overflow: hidden; /* Щоб внутрішні елементи не виходили за межі радіусу */
}

.chat-header {
  background-color: #42b983; /* Зелений колір хедера */
  padding: 10px 15px;
  border-top-left-radius: 10px; /* Закруглення кутів хедера */
  border-top-right-radius: 10px;
  display: flex;
  justify-content: space-between; /* Розташування тексту та кнопки по краях */
  align-items: center;
  font-weight: bold;
  flex-shrink: 0; /* Хедер не має стискатися */
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 0 5px; /* Невеликий відступ для клікабельності */
}
.close-btn:hover {
  opacity: 0.8;
}

.chat-messages {
  flex-grow: 1; /* Займає весь доступний простір по висоті */
  padding: 15px;
  overflow-y: auto; /* Додає вертикальну прокрутку, якщо повідомлень багато */
  display: flex;
  flex-direction: column;
  gap: 12px; /* Відстань між повідомленнями */
  background-color: #1e1e1e; /* Дуже темний фон для області повідомлень */
}

.message {
  padding: 8px 12px;
  border-radius: 15px;
  max-width: 80%;
  word-wrap: break-word;
  background-color: #3a3f44; /* Фон для отриманих (залишається) */
  align-self: flex-start;
  color: #e0e0e0;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.message.my-message {
  background-color: #42b983; /* Фон для "моїх" повідомлень (зелений) */
  align-self: flex-end;
  color: #ffffff; /* Залишаємо білий текст на зеленому фоні */
}

.sender-name {
  font-size: 0.8em; /* Менший розмір шрифту для імені */
  font-weight: bold;
  display: block;
  margin-bottom: 4px;
  color: #bdbdbd; /* Колір імені */
}
.message.my-message .sender-name {
  /* Можна приховати ім'я для своїх повідомлень, якщо 'Я' достатньо */
  /* display: none; */
  color: #e0e0e0;
}

.message-content {
  margin: 0;
  font-size: 0.95em;
  line-height: 1.4; /* Міжрядковий інтервал */
}

.timestamp {
  font-size: 0.75em; /* Менший розмір шрифту для часу */
  color: #ffffff;
  display: block;
  text-align: right; /* Час справа */
  margin-top: 5px;
}
/* .message.my-message .timestamp { } */ /* Зайве правило, text-align вже right */

.chat-input {
  display: flex;
  padding: 12px; /* Збільшено падінг */
  border-top: 1px solid #444;
  background-color: #2c2f33; /* Той самий колір, що й вікно */
  flex-shrink: 0; /* Інпут не має стискатися */
}

.chat-input input {
  flex-grow: 1; /* Займає доступний простір */
  padding: 10px 12px;
  border: 1px solid #555;
  border-radius: 20px; /* Більш круглі краї */
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
  border-color: #42b983; /* Підсвітка при фокусі */
}

.chat-input button {
  padding: 10px 18px; /* Збільшено кнопку */
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 20px; /* Більш круглі краї */
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-weight: bold;
}

.chat-input button:hover {
  background-color: #369966;
}

/* Стилізація скролбару в чаті */
.chat-messages::-webkit-scrollbar {
  width: 8px; /* Трохи ширший скролбар */
}
.chat-messages::-webkit-scrollbar-thumb {
  background-color: #42b983;
  border-radius: 4px;
  border: 2px solid #1e1e1e; /* Відступ від краю */
}
.chat-messages::-webkit-scrollbar-track {
  background-color: #1e1e1e;
}
.chat-messages {
  scrollbar-width: thin;
  scrollbar-color: #42b983 #1e1e1e;
}
</style>