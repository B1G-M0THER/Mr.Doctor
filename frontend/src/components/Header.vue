<template>
  <header class="navbar">
    <div class="logo">
      <img src="../assets/logo.png" alt="Vue Logo" />
    </div>
    <nav class="nav-links">
      <ul>
        <li><router-link to="/">Головна</router-link></li>
        <li><router-link to="/deposit">Депозити</router-link></li>
        <li v-if="isLoggedIn"><router-link to="/open-card">Відкрити карту</router-link></li>
        <li><router-link to="/credit">Кредити</router-link></li>
        <li><router-link to="/about">Про нас</router-link></li>
      </ul>
    </nav>
    <div class="auth-section">
      <div v-if="!isLoggedIn">
        <button class="auth-button" @click="showRegisterModal = true">
          Реєстрація/Логін
        </button>
      </div>

      <div v-if="isLoggedIn" class="profile-container">
        <div v-if="role !== 'ADMIN'" class="chat-icon-container" @click="toggleChatWindow">
          <div class="profile-icon chat-icon">
            <img src="../assets/support.png" alt="Support Chat" class="profile-img light" />
            <img src="../assets/support_green.png" alt="Support Chat" class="profile-img dark" />
          </div>
          <span v-if="chatStore.hasUnreadMessages" class="unread-indicator"></span>
        </div>

        <router-link :to="role === 'ADMIN' ? '/admin' : '/profile'" class="profile-icon">
          <img
              v-if="role !== 'ADMIN'"
              src="../assets/profile.png"
              alt="Profile"
              class="profile-img light"
          />
          <img
              v-if="role !== 'ADMIN'"
              src="../assets/profile_green.png"
              alt="Profile"
              class="profile-img dark"
          />
          <img
              v-if="role === 'ADMIN'"
              src="../assets/admin.png"
              alt="Admin Profile"
              class="profile-img light"
          />
          <img
              v-if="role === 'ADMIN'"
              src="../assets/admin_green.png"
              alt="Admin Profile"
              class="profile-img dark"
          />
        </router-link>

        <button class="logout-button" @click="logout">Вийти</button>
      </div>
    </div>

    <div v-if="showRegisterModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="close-icon" @click="closeModal">×</div>

        <div class="tabs">
          <button :class="{ active: isRegistrationMode }" @click="switchMode(true)">
            Реєстрація
          </button>
          <button :class="{ active: !isRegistrationMode }" @click="switchMode(false)">
            Логін
          </button>
        </div>

        <div v-if="isRegistrationMode">
          <form @submit.prevent="register">
            <div class="form-group">
              <label for="name">Ім'я:</label>
              <input type="text" v-model="name" autocomplete="name" placeholder="Введіть ваше ім'я" required />
            </div>
            <div class="form-group">
              <label for="email">Електронна пошта:</label>
              <input type="email" v-model="email" autocomplete="email" placeholder="Введіть ваш email" required />
            </div>
            <div class="form-group">
              <label for="phone">Телефон:</label>
              <vue-tel-input v-model="phone" :input-options="{ placeholder: 'Введіть номер телефону'}" />
            </div>
            <div class="form-group">
              <label for="password">Пароль:</label>
              <input type="password" v-model="password" placeholder="Введіть ваш пароль" required />
            </div>
            <div class="form-group">
              <button type="submit" class="submit-button">Зареєструватися</button>
            </div>
          </form>
        </div>

        <div v-else>
          <form @submit.prevent="login">
            <div class="form-group">
              <label for="email">Електронна пошта:</label>
              <input type="email" v-model="email" autocomplete="email" placeholder="Введіть ваш email" required />
            </div>
            <div class="form-group">
              <label for="password">Пароль:</label>
              <input type="password" v-model="password" placeholder="Введіть ваш пароль" required />
            </div>
            <div class="form-group">
              <button type="submit" class="submit-button">Увійти</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <ChatWindow v-if="isLoggedIn && role !== 'ADMIN' && chatStore.isChatOpen" />

  </header>
</template>

<script>
import { ref, onMounted } from "vue"; // Видалено watch, onUnmounted (якщо не потрібні для інших цілей)
import { VueTelInput } from "vue-tel-input"; // Якщо не зареєстровано глобально, залиште імпорт
import axios from "axios";
import { useRouter } from 'vue-router'; // Для навігації при виході
import { useChatStore } from '../store/chatStore'; // Імпорт сховища чату
import ChatWindow from './ChatWindow.vue'; // Імпорт компонента чату

export default {
  name: "Header", // Додано ім'я компонента
  components: {
    VueTelInput, // Якщо не зареєстровано глобально
    ChatWindow
  },
  setup() {
    const router = useRouter();
    const chatStore = useChatStore(); // Ініціалізуємо сховище чату

    // Реактивні змінні стану
    const showRegisterModal = ref(false);
    const isRegistrationMode = ref(true);
    const email = ref("");
    const name = ref("");
    const phone = ref("");
    const password = ref("");
    // Ініціалізуємо стан логіну, ролі та ID з localStorage
    const isLoggedIn = ref(!!localStorage.getItem("token"));
    const role = ref(localStorage.getItem("role"));
    const userId = ref(localStorage.getItem("userId"));

    // Функція закриття модального вікна
    const closeModal = () => {
      showRegisterModal.value = false;
    };

    // Налаштування Axios Interceptor для автоматичного додавання токена
    // Цей код має виконуватись лише один раз при старті додатку,
    // тому краще його винести в main.js або окремий файл налаштування axios
    // Якщо він залишається тут, переконайтесь, що він не викликається багаторазово
    // (наприклад, при HMR під час розробки)
    // Для прикладу залишаємо тут, але рекомендуємо винести.
    const interceptor = axios.interceptors.request.use(
        (config) => {
          const token = localStorage.getItem("token");
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        },
        (error) => {
          return Promise.reject(error);
        }
    );
    // Щоб уникнути дублювання інтерсепторів при HMR, можна його видаляти перед додаванням
    // onUnmounted(() => { axios.interceptors.request.eject(interceptor); });

    // Перемикання між формами логіну/реєстрації
    const switchMode = (isRegister) => {
      isRegistrationMode.value = isRegister;
      // Очищуємо поля при перемиканні
      email.value = "";
      password.value = "";
      name.value = "";
      phone.value = "";
    };

    // Функція реєстрації
    const register = async () => {
      // Проста валідація (можна додати складнішу)
      const nameRegex = /^[a-zA-Zа-яА-ЯіІїЇєЄ']{2,}\s[a-zA-Zа-яА-ЯіІїЇєЄ']{3,}$/u; // Дозволяє кирилицю та апостроф
      if (!nameRegex.test(name.value)) {
        alert(
            "Будь ласка, введіть ім'я (мінімум 2 літери) та прізвище (мінімум 3 літери)."
        );
        return;
      }
      const emailRegex = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/iu;
      if (!emailRegex.test(email.value)) {
        alert("Будь ласка, введіть коректну електронну пошту.");
        return;
      }
      if (!phone.value) {
        alert("Будь ласка, введіть номер телефону.");
        return;
      }
      if (password.value.length < 6) { // Приклад валідації пароля
        alert("Пароль повинен містити щонайменше 6 символів.");
        return;
      }

      try {
        // ВИПРАВЛЕНО: Використовуємо правильний URL /auth/register
        const response = await axios.post("/api/register", {
          name: name.value,
          email: email.value,
          phone_number: phone.value, // Переконайтесь, що поле називається phone_number на бекенді
          password: password.value,
        });
        alert(response.data.message || "Реєстрація успішна! Тепер ви можете увійти."); // Повідомлення з бекенду або стандартне
        switchMode(false); // Перемкнути на логін після успішної реєстрації
      } catch (error) {
        alert("Помилка реєстрації: " + (error.response?.data?.error || error.message));
      }
    };

    // Функція логіну
    const login = async () => {
      if (!email.value || !password.value) {
        alert("Будь ласка, заповніть email та пароль.");
        return;
      }
      try {
        // ВИПРАВЛЕНО: Використовуємо правильний URL /auth/login
        const response = await axios.post("/api/login", {
          email: email.value,
          password: password.value,
        });
        
        console.log("Login Response Data:", response.data);
        // Зберігаємо дані в localStorage
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("role", response.data.role);
        // Переконайтесь, що бекенд повертає userId!
        if (response.data.userId) {
          localStorage.setItem("userId", response.data.userId);
          userId.value = response.data.userId; // Оновлюємо реактивну змінну
          console.log(`Stored userId in localStorage: ${response.data.userId}`);
        } else {
          console.warn("userId not found in login response!");
          // Можливо, потрібно отримати профіль окремо, щоб дізнатись ID?
        }


        // Оновлюємо реактивні змінні стану
        isLoggedIn.value = true;
        role.value = response.data.role;

        // Підключаємо сокет після успішного логіну
        chatStore.connectSocket();
        chatStore.setupListeners();
        closeModal(); // Закриваємо модальне вікно
      } catch (error) {
        alert("Помилка входу: " + (error.response?.data?.error || error.message));
      }
    };

    // Функція виходу
    const logout = () => {
      // Відключаємо сокет
      chatStore.disconnectSocket();

      // Очищуємо localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");

      // Оновлюємо реактивні змінні стану
      isLoggedIn.value = false;
      role.value = "";
      userId.value = null;

      // ВИПРАВЛЕНО: Використовуємо router.push для навігації без перезавантаження
      router.push('/');
    };

    // Функція для відкриття/закриття вікна чату
    const toggleChatWindow = () => {
      chatStore.toggleChat();
    };

    // Підключаємо сокет при завантаженні сторінки, якщо користувач вже залогінений
    onMounted(() => {
      if (isLoggedIn.value) {
        chatStore.connectSocket();
        chatStore.setupListeners();
      }
    });

    // Повертаємо всі необхідні змінні та функції для використання в шаблоні
    return {
      showRegisterModal,
      isRegistrationMode,
      email,
      name,
      phone,
      password,
      role,
      isLoggedIn,
      userId, // Повертаємо userId, хоч він прямо не використовується в шаблоні
      closeModal,
      switchMode,
      register,
      login,
      logout,
      chatStore, // Повертаємо екземпляр стору для доступу до стану (isChatOpen, hasUnreadMessages)
      toggleChatWindow, // Повертаємо функцію для кліку на іконку чату
    };
  },
};
</script>

<style scoped>
/* Основний стиль */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #1A1A1A;
  color: #ffffff;
  padding: 10px 20px;
  height: 60px; /* Висота хедера */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid #2a2f33;
  position: relative; /* Для позиціонування ChatWindow */
  z-index: 1000; /* Вище за інший контент */
}

.profile-container {
  display: flex;
  align-items: center; /* Вертикальне вирівнювання іконок і кнопки */
  gap: 15px; /* Відстань між елементами */
}

/* Стилізація кнопки Вийти */
.logout-button {
  background: none;
  border: none;
  color: #ffffff;
  /* font-size: 12px; */ /* Зробимо трохи більшим */
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: color 0.3s ease;
  position: relative;
  padding: 5px 0; /* Додамо трохи вертикального падінгу */
}

.logout-button::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 1px;
  background-color: #42b983;
  transition: width 0.3s ease, left 0.3s ease;
  transform: translateX(-50%);
}

.logout-button:hover {
  color: #42b983;
}

.logout-button:hover::after {
  width: 100%;
}

/* Загальні стилі для іконок (профіль та чат) */
.profile-icon {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 40px;
  cursor: pointer; /* Додаємо курсор для іконок-посилань */
}

.profile-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.3s ease-in-out;
}

.profile-img.dark {
  opacity: 0;
}

.profile-icon:hover .profile-img.light {
  opacity: 0;
}

.profile-icon:hover .profile-img.dark {
  opacity: 1;
}

/* Контейнер іконки чату для позиціонування індикатора */
.chat-icon-container {
  position: relative;
  cursor: pointer; /* Курсор для іконки чату */
}

/* Індикатор непрочитаних повідомлень */
.unread-indicator {
  position: absolute;
  top: -2px;  /* Позиціонування */
  right: -2px; /* Позиціонування */
  width: 10px;
  height: 10px;
  background-color: red;
  border-radius: 50%;
  border: 1.5px solid #1A1A1A; /* Обводка кольором фону для контрасту */
  box-shadow: 0 0 3px rgba(255, 0, 0, 0.7); /* Легке світіння */
}

/* Логотип */
.logo img {
  height: 84px; /* Перевірте, чи цей розмір правильний */
  vertical-align: middle; /* Краще вирівнювання */
}

/* Навігаційні посилання */
.nav-links {
  flex-grow: 1;
  text-align: right;
  margin: 0 20px; /* Додамо відступи */
}

.nav-links ul {
  list-style: none;
  display: flex;
  justify-content: flex-end;
  gap: 25px; /* Збільшимо відстань */
  margin: 0;
  padding: 0;
}

.nav-links ul li a {
  position: relative;
  color: #ffffff;
  text-decoration: none;
  font-weight: bold;
  font-size: 16px;
  transition: color 0.3s ease;
  padding-bottom: 8px; /* Додамо місце для підкреслення */
}

.nav-links ul li a::after {
  content: '';
  position: absolute;
  bottom: 0; /* Підкреслення знизу */
  left: 50%;
  width: 0;
  height: 2px;
  background-color: #42b983;
  transition: width 0.3s ease, left 0.3s ease;
  transform: translateX(-50%); /* Центрування підкреслення */
}

.nav-links ul li a:hover {
  color: #42b983;
}

.nav-links ul li a:hover::after {
  width: 100%;
  left: 0;
  transform: translateX(0%); /* Підкреслення на всю ширину */
}
/* Секція автентифікації */
.auth-section {
  margin-left: 40px; /* Прибрали фіксований відступ, використовуємо flex/gap */
}

.auth-button {
  background-color: #42b983;
  color: #ffffff;
  padding: 8px 15px;
  border: none;
  border-radius: 5px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.auth-button:hover {
  background-color: #369966;
}

/* --- Стилі Модального Вікна (залишаються без змін) --- */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background: rgba(0, 0, 0, 0.7); /* Трохи темніше */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050; /* Вище за хедер */
}

.modal-content {
  background-color: #1a1a1a;
  color: #ffffff;
  width: 90%; /* Адаптивна ширина */
  max-width: 400px; /* Максимальна ширина */
  padding: 30px; /* Більше падінгу */
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
  position: relative;
  text-align: center;
}

.close-icon {
  position: absolute;
  top: 10px;
  right: 15px;
  font-size: 28px;
  color: #aaa;
  cursor: pointer;
  transition: color 0.3s ease;
}
.close-icon:hover {
  color: #fff;
}

.tabs {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 25px;
}

.tabs button {
  background-color: transparent;
  border: none;
  color: #aaa;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  padding-bottom: 8px;
  border-bottom: 2px solid transparent;
  transition: color 0.3s ease, border-color 0.3s ease;
}

.tabs button:hover {
  color: #fff;
}

.tabs button.active {
  color: #42b983;
  border-color: #42b983;
}

.form-group {
  text-align: left;
  margin-bottom: 20px; /* Більша відстань */
}

.form-group label {
  display: block;
  margin-bottom: 8px; /* Більша відстань */
  color: #cfd8dc;
  font-size: 14px;
}

.form-group input,
:deep(.vue-tel-input) { /* Застосовуємо і до vue-tel-input */
  width: 100%;
  padding: 10px 12px; /* Більший падінг */
  border: 1px solid #444;
  border-radius: 5px;
  background-color: #333;
  color: #fff;
  /* max-width та max-height прибрані для гнучкості */
  box-sizing: border-box; /* Важливо для правильного розрахунку ширини */
  font-size: 16px; /* Збільшимо шрифт */
  transition: border-color 0.3s ease;
}
.form-group input:focus,
:deep(.vue-tel-input.focused .vti__input) { /* Стиль фокусу */
  border-color: #42b983;
  outline: none;
}


.submit-button {
  background-color: #42b983;
  padding: 12px 25px; /* Більша кнопка */
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: background-color 0.3s ease;
  width: 100%; /* Кнопка на всю ширину */
  margin-top: 10px; /* Відступ зверху */
}
.submit-button:hover {
  background-color: #369966;
}


/* --- Глибока стилізація vue-tel-input (залишається без змін) --- */
:deep(.vue-tel-input) {
  border: 1px solid #444 !important;
  box-shadow: none !important;
  background-color: #333 !important;
  color: #fff !important;
  border-radius: 5px !important;
  /* width: 100% !important; */ /* Вже задано вище */
  /* max-width: none !important; */ /* Прибрали обмеження */
}

:deep(.vue-tel-input .vti__input) { /* Стилізуємо саме поле вводу */
  background-color: transparent !important;
  color: #fff !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  width: 100% !important;
  font-size: 16px !important; /* Як у звичайних інпутах */
  padding: 0 !important; /* Внутрішні падінги вже є у wrapper */
}


:deep(.vue-tel-input .vti__dropdown) {
  background-color: #333 !important;
  color: #fff;
  border: none !important;
  border-top-left-radius: 5px; /* Закруглення */
  border-bottom-left-radius: 5px;
}
:deep(.vue-tel-input .vti__dropdown:hover) {
  background-color: #444 !important;
}


:deep(.vue-tel-input input::placeholder) {
  color: #aaa;
  opacity: 0.7;
}

:deep(.vti__dropdown-list) { /* Контейнер списку країн */
  background-color: #333 !important;
  border: 1px solid #555 !important;
}

:deep(.vti__dropdown-item) {
  background-color: #333 !important;
  color: #fff;
}

:deep(.vti__dropdown-item:hover) {
  background-color: #444 !important;
  color: #fff;
}
:deep(.vti__dropdown-item.highlighted) { /* Вибрана країна */
  background-color: #555 !important;
}

</style>