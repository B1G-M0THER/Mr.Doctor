<template>
  <header class="navbar">
    <div class="logo">
      <router-link to="/"><img src="../assets/logo.png" alt="Mr.Doctor Bank Logo" /></router-link>
    </div>

    <button class="hamburger-menu" @click="toggleMobileMenu" aria-label="Toggle navigation" :class="{ 'open': isMobileMenuOpen }">
      <span class="hamburger-bar"></span>
      <span class="hamburger-bar"></span>
      <span class="hamburger-bar"></span>
    </button>

    <nav class="nav-links desktop-nav">
      <ul>
        <li><router-link to="/" @click="closeMobileMenuIfNeeded">Головна</router-link></li>
        <li v-if="role !== 'ADMIN'"><router-link to="/deposit" @click="closeMobileMenuIfNeeded">Депозити</router-link></li>
        <li v-if="isLoggedIn && role !== 'ADMIN'"><router-link to="/open-card" @click="closeMobileMenuIfNeeded">Відкрити карту</router-link></li>
        <li v-if="role !== 'ADMIN'"><router-link to="/credit" @click="closeMobileMenuIfNeeded">Кредити</router-link></li>
      </ul>
    </nav>

    <div class="auth-section">
      <div v-if="role !== 'ADMIN' && isLoggedIn" class="profile-icon balance-icon-container desktop-specific-icon" @click="toggleTopUpModal">
        <div class="profile-icon balance-icon">
          <img src="../assets/balance.png" alt="Поповнити баланс" class="profile-img light" />
          <img src="../assets/balance_green.png" alt="Поповнити баланс" class="profile-img dark" />
        </div>
      </div>

      <div v-if="!isLoggedIn">
        <button class="auth-button" @click="showRegisterModal = true">
          Реєстрація/Логін
        </button>
      </div>

      <div v-if="isLoggedIn" class="profile-container">
        <div v-if="role !== 'ADMIN'" class="chat-icon-container desktop-specific-icon" @click="toggleChatWindow">
          <div class="profile-icon chat-icon">
            <img src="../assets/support.png" alt="Support Chat" class="profile-img light" />
            <img src="../assets/support_green.png" alt="Support Chat" class="profile-img dark" />
          </div>
          <span v-if="chatStore.hasUnreadMessages" class="unread-indicator"></span>
        </div>

        <router-link :to="role === 'ADMIN' ? '/admin' : '/profile'" class="profile-icon desktop-icon" @click="closeMobileMenuIfNeeded">
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

        <button class="logout-button desktop-icon" @click="logoutAndCloseMenu">Вийти</button>
      </div>
    </div>

    <nav class="mobile-nav" :class="{ 'open': isMobileMenuOpen }">
      <ul>
        <li><router-link to="/" @click="toggleMobileMenu">Головна</router-link></li>
        <li v-if="role !== 'ADMIN'"><router-link to="/deposit" @click="toggleMobileMenu">Депозити</router-link></li>
        <li v-if="isLoggedIn && role !== 'ADMIN'"><router-link to="/open-card" @click="toggleMobileMenu">Відкрити карту</router-link></li>
        <li v-if="role !== 'ADMIN'"><router-link to="/credit" @click="toggleMobileMenu">Кредити</router-link></li>

        <li v-if="isLoggedIn" class="nav-separator"></li>

        <li v-if="isLoggedIn && role !== 'ADMIN'" class="mobile-nav-action" @click="handleMobileTopUp">
          <img src="../assets/balance.png" alt="Поповнити баланс"/> Поповнити баланс
        </li>
        <li v-if="isLoggedIn && role !== 'ADMIN'" class="mobile-nav-action" @click="handleMobileChat">
          <img src="../assets/support.png" alt="Підтримка"/> Підтримка
          <span v-if="chatStore.hasUnreadMessages" class="unread-indicator mobile-unread"></span>
        </li>
        <li v-if="isLoggedIn" class="profile-logout-stack">
          <router-link :to="role === 'ADMIN' ? '/admin' : '/profile'" class="profile-icon-link" @click="toggleMobileMenu">
            <img v-if="role !== 'ADMIN'" src="../assets/profile.png" alt="Profile"/>
            <img v-if="role === 'ADMIN'" src="../assets/admin.png" alt="Admin Profile"/>
            <span>{{ role === 'ADMIN' ? 'Адмін Панель' : 'Мій Профіль' }}</span>
            <button class="logout-button-stacked" @click="logout">Вийти</button>
          </router-link>
        </li>
      </ul>
    </nav>

    <div v-if="showRegisterModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="close-icon" @click="closeModal">×</div>
        <div class="tabs">
          <button :class="{ active: isRegistrationMode }" @click="switchMode(true)">Реєстрація</button>
          <button :class="{ active: !isRegistrationMode }" @click="switchMode(false)">Логін</button>
        </div>
        <div v-if="isRegistrationMode">
          <form @submit.prevent="register">
            <div class="form-group"><label for="name">Ім'я:</label><input type="text" v-model="name" autocomplete="name" placeholder="Введіть ваше ім'я" required /></div>
            <div class="form-group"><label for="email">Електронна пошта:</label><input type="email" v-model="email" autocomplete="email" placeholder="Введіть ваш email" required /></div>
            <div class="form-group"><label for="phone">Телефон:</label><vue-tel-input v-model="phone" :input-options="{ placeholder: 'Введіть номер телефону'}" /></div>
            <div class="form-group"><label for="password">Пароль:</label><input type="password" v-model="password" placeholder="Введіть ваш пароль" required /></div>
            <div class="form-group"><button type="submit" class="submit-button">Зареєструватися</button></div>
          </form>
        </div>
        <div v-else>
          <form @submit.prevent="login">
            <div class="form-group"><label for="email">Електронна пошта:</label><input type="email" v-model="email" autocomplete="email" placeholder="Введіть ваш email" required /></div>
            <div class="form-group"><label for="password">Пароль:</label><input type="password" v-model="password" placeholder="Введіть ваш пароль" required /></div>
            <div class="form-group"><button type="submit" class="submit-button">Увійти</button></div>
          </form>
        </div>
      </div>
    </div>

    <div v-if="showTopUpModal" class="modal-overlay" @click.self="toggleTopUpModal">
      <div class="modal-content topup-modal-content">
        <div class="close-icon" @click="toggleTopUpModal">×</div>
        <h3>Поповнення картки</h3>
        <form @submit.prevent="submitTopUp">
          <div class="form-group">
            <label for="topup-amount">Введіть суму (UAH):</label>
            <input type="number" id="topup-amount" v-model="topUpAmount" placeholder="Наприклад, 500" step="0.01" min="1" required />
          </div>
          <div class="form-group">
            <button type="submit" class="submit-button">Поповнити</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showTopUpSuccess" class="success-notification">
      {{ successMessage }}
    </div>

    <ChatWindow v-if="isLoggedIn && role !== 'ADMIN' && chatStore.isChatOpen" />
  </header>
</template>

<script>
import { ref, onMounted } from "vue";
import { VueTelInput } from "vue-tel-input";
import api from '../api.js';
import { useRouter } from 'vue-router';
import { useChatStore } from '../store/chatStore';
import ChatWindow from './ChatWindow.vue';
import {useUiStore} from "../store/uiStore.js";

export default {
  name: "Header",
  components: {
    VueTelInput,
    ChatWindow
  },
  setup() {
    const router = useRouter();
    const chatStore = useChatStore();
    const uiStore = useUiStore();

    const showRegisterModal = ref(false);
    const isRegistrationMode = ref(true);
    const email = ref("");
    const name = ref("");
    const phone = ref("");
    const password = ref("");
    const userCard = ref(null);

    const isLoggedIn = ref(!!localStorage.getItem("token"));
    const role = ref(localStorage.getItem("role"));
    const userId = ref(localStorage.getItem("userId"));
    const showTopUpModal = ref(false);
    const topUpAmount = ref('');
    const showTopUpSuccess = ref(false);
    const successMessage = ref('');
    let successTimeout = null;

    const isMobileMenuOpen = ref(false);

    const toggleMobileMenu = () => {
      isMobileMenuOpen.value = !isMobileMenuOpen.value;
    };

    const closeMobileMenuIfNeeded = () => {
      if (isMobileMenuOpen.value) {
        isMobileMenuOpen.value = false;
      }
    };

    const handleMobileTopUp = () => {
      toggleTopUpModal();
      closeMobileMenuIfNeeded();
    };

    const handleMobileChat = () => {
      toggleChatWindow(); // Ваша існуюча функція
      closeMobileMenuIfNeeded();
    };

    const logoutAndCloseMenu = () => {
      logout();
      closeMobileMenuIfNeeded();
    };
    const updateAuthStatus = () => {
      isLoggedIn.value = !!localStorage.getItem("token");
      role.value = localStorage.getItem("role");
      userId.value = localStorage.getItem("userId");
    };

    const toggleTopUpModal = () => {
      showTopUpModal.value = !showTopUpModal.value;
      topUpAmount.value = '';
    };

    const submitTopUp = async () => {
      const amount = parseFloat(topUpAmount.value);

      if (isNaN(amount) || amount <= 0) {
        uiStore.addNotification({
          message: 'Будь ласка, введіть коректну суму для поповнення.',
          type: 'error'
        });
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          uiStore.addNotification({
            message: 'Помилка автентифікації. Спробуйте увійти знову.',
            type: 'error'
          });
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };

        const response = await api.post('/api/cards/topup', { amount }, { headers });

        showTopUpModal.value = false;
        topUpAmount.value = '';
        uiStore.addNotification({
          message: `Вашу карту поповнено на ${amount.toFixed(2)} UAH`,
          type: 'success'
        });

      } catch (error) {
        console.error("Помилка поповнення картки:", error);
        uiStore.addNotification({
          message: 'Помилка поповнення: ' + (error.response?.data?.error || error.message),
          type: 'error'
        });
      }
    };

    const closeModal = () => {
      showRegisterModal.value = false;
    };

    const switchMode = (isRegister) => {
      isRegistrationMode.value = isRegister;
      email.value = "";
      password.value = "";
      name.value = "";
      phone.value = "";
    };

    const register = async () => {
      const nameRegex = /^[a-zA-Z]{2,}\s[a-zA-Z]{3,}$/u;
      if (!nameRegex.test(name.value)) {
        uiStore.addNotification({
          message: "Будь ласка, введіть ім'я (мінімум 2 літери) та прізвище (мінімум 3 літери) латиницею.",
          type: 'error'
        });
        return;
      }
      const emailRegex = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/iu;
      if (!emailRegex.test(email.value)) {
        uiStore.addNotification({
          message: "Будь ласка, введіть коректну електронну пошту.",
          type: 'error'
        });
        return;
      }
      if (!phone.value) {
        uiStore.addNotification({
          message: "Будь ласка, введіть номер телефону.",
          type: 'error'
        });
        return;
      }
      if (password.value.length < 6) {
        uiStore.addNotification({
          message: "Пароль повинен містити щонайменше 6 символів.",
          type: 'error'
        });
        return;
      }

      try {
        const response = await api.post("/api/register", {
          name: name.value,
          email: email.value,
          phone_number: phone.value,
          password: password.value,
        });
        uiStore.addNotification({
          message: response.data.message || "Реєстрація успішна! Тепер ви можете увійти.",
          type: 'success'
        });
        switchMode(false);
      } catch (error) {
        uiStore.addNotification({
          message: "Помилка реєстрації: " + (error.response?.data?.error || error.message),
          type: 'error'
        });
      }
    };

    const login = async () => {
      if (!email.value || !password.value) {
        uiStore.addNotification({
          message: "Будь ласка, заповніть email та пароль.",
          type: 'error'
        });
        return;
      }
      try {
        const response = await api.post("/api/login", {
          email: email.value,
          password: password.value,
        });
        
        console.log("Login Response Data:", response.data);
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("role", response.data.role);

        if (response.data.userId) {
          localStorage.setItem("userId", response.data.userId);
          userId.value = response.data.userId;
          console.log(`Stored userId in localStorage: ${response.data.userId}`);
        } else {
          console.warn("userId not found in login response!");
        }

        isLoggedIn.value = true;
        role.value = response.data.role;

        updateAuthStatus();

        if (role.value !== 'ADMIN') {
          chatStore.connectSocket();
        }

        chatStore.connectSocket();
        chatStore.setupListeners();
        closeModal();
        closeMobileMenuIfNeeded();

      } catch (error) {
        uiStore.addNotification({
          message: "Помилка входу: " + (error.response?.data?.error || error.message),
          type: 'error'
        });
      }
    };

    const logout = () => {
      if(isLoggedIn.value && role.value !== 'ADMIN'){
        chatStore.disconnectSocket();
      }

      chatStore.disconnectSocket();

      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");

      isLoggedIn.value = false;
      role.value = "";
      userId.value = null;

      updateAuthStatus();
      router.push('/');
    };

    const toggleChatWindow = () => {
      chatStore.toggleChat();
    };

    onMounted(() => {
      updateAuthStatus();
      if (isLoggedIn.value && role.value !== 'ADMIN') {
        chatStore.connectSocket();
      }
    });

    return {
      showRegisterModal,
      isRegistrationMode,
      email,
      name,
      phone,
      password,
      role,
      isLoggedIn,
      userId,
      closeModal,
      switchMode,
      register,
      login,
      logout,
      chatStore,
      toggleChatWindow,
      showTopUpModal,
      topUpAmount,
      toggleTopUpModal,
      submitTopUp,
      showTopUpSuccess,
      successMessage,
      isMobileMenuOpen,
      toggleMobileMenu,
      closeMobileMenuIfNeeded,
      logoutAndCloseMenu,
      handleMobileTopUp,
      handleMobileChat,
    };
  },
};
</script>

<style scoped>

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #1A1A1A;
  color: #ffffff;
  padding: 10px 20px;
  height: 60px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid #2a2f33;
  position: relative;
  z-index: 1000;
}

.profile-container {
  display: flex;
  align-items: center;
  gap: 15px;
}

.logout-button {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: color 0.3s ease;
  position: relative;
  padding: 5px 0;
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

.profile-icon {
  position: relative;
  display: inline-block;
  width: 45px;
  height: 45px;
  cursor: pointer;
}

.profile-icon .balance-icon-container{
  width: 20px;
  height: 20px;
}
.profile-icon .balance-icon{
  width: 20px;
  height: 20px;
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

.chat-icon-container {
  position: relative;
  width: 40px;
  height: 40px;
  cursor: pointer;
}

.unread-indicator {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  background-color: red;
  border-radius: 50%;
  border: 1.5px solid #1A1A1A;
  box-shadow: 0 0 3px rgba(255, 0, 0, 0.7);
}

.logo img {
  height: 50px;
  vertical-align: middle;
  margin-right: 10px;
}

.navbar-left {
  display: flex;
  align-items: center;
}

.nav-links {
  flex-grow: 1;
  text-align: right;
  margin: 0 20px;
}

.nav-links ul {
  list-style: none;
  display: flex;
  justify-content: flex-end;
  gap: 25px;
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
  padding-bottom: 8px;
}

.nav-links ul li a::after {
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

.nav-links ul li a:hover {
  color: #42b983;
}

.nav-links ul li a:hover::after {
  width: 100%;
}

.user-actions-group { /* Обгортка для іконок балансу/чату та блоку профілю/виходу */
  display: flex;
  align-items: center;
  gap: 15px;
}

.auth-section {
  display: flex; /* Дозволяє .user-actions-group вирівнятися по центру вертикально */
  align-items: center;
  gap: 10px; /* Якщо будуть інші елементи поруч з .user-actions-group */
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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
}

.modal-content {
  background-color: #1a1a1a;
  color: #ffffff;
  width: 90%;
  max-width: 400px;
  padding: 30px;
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
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #cfd8dc;
  font-size: 14px;
}

.form-group input,
:deep(.vue-tel-input) {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #444;
  border-radius: 5px;
  background-color: #333;
  color: #fff;
  box-sizing: border-box;
  font-size: 16px;
  transition: border-color 0.3s ease;
}
.form-group input:focus,
:deep(.vue-tel-input.focused .vti__input) {
  border-color: #42b983;
  outline: none;
}


.submit-button {
  background-color: #42b983;
  padding: 12px 25px;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: background-color 0.3s ease;
  width: 100%;
  margin-top: 10px;
}
.submit-button:hover {
  background-color: #369966;
}

:deep(.vue-tel-input) {
  border: 1px solid #444 !important;
  box-shadow: none !important;
  background-color: #333 !important;
  color: #fff !important;
  border-radius: 5px !important;
}

:deep(.vue-tel-input .vti__input) {
  background-color: transparent !important;
  color: #fff !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  width: 100% !important;
  font-size: 16px !important;
  padding: 0 !important;
}

:deep(.vue-tel-input .vti__dropdown) {
  background-color: #333 !important;
  color: #fff;
  border: none !important;
  border-top-left-radius: 5px;
  border-bottom-left-radius: 5px;
}
:deep(.vue-tel-input .vti__dropdown:hover) {
  background-color: #444 !important;
}


:deep(.vue-tel-input input::placeholder) {
  color: #aaa;
  opacity: 0.7;
}

:deep(.vti__dropdown-list) {
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
:deep(.vti__dropdown-item.highlighted) {
  background-color: #555 !important;
}

.balance-icon-container {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.balance-icon .profile-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.3s ease-in-out;
}
.balance-icon .profile-img.dark {
  opacity: 0;
}
.balance-icon-container:hover .balance-icon .profile-img.light {
  opacity: 0;
}
.balance-icon-container:hover .balance-icon .profile-img.dark {
  opacity: 1;
}

.topup-modal-content {
  max-width: 350px;
}
.topup-modal-content h3 {
  color: #42b983;
  margin-bottom: 25px;
}

.success-notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: #42b983;
  color: #ffffff;
  padding: 15px 25px;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  z-index: 1100;
  font-size: 14px;
  font-weight: bold;
  animation: slideInFadeOut 5s forwards ease-in-out;
}

@keyframes slideInFadeOut {
  0% {
    transform: translateX(100%);
    opacity: 0;
  }
  10%, 90% {
    transform: translateX(0);
    opacity: 1;
  }
  100% {
    transform: translateX(100%);
    opacity: 0;
  }
}

.desktop-specific-icon {
}

.profile-logout-stack { /* Нова обгортка для іконки профілю та кнопки "Вийти" */
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.hamburger-menu {
  display: none;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 5px;
  z-index: 1100;
}

.hamburger-bar {
  display: block;
  width: 22px;
  height: 3px;
  margin: 4px auto;
  background-color: white;
  transition: all 0.3s ease-in-out;
}

.hamburger-menu.open .hamburger-bar:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}
.hamburger-menu.open .hamburger-bar:nth-child(2) {
  opacity: 0;
}
.hamburger-menu.open .hamburger-bar:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

.mobile-nav {
  display: none;
  position: absolute;
  top: 60px; /* Висота вашого хедера */
  left: 0;
  right: 0;
  background-color: #1c1c1e;
  z-index: 1000;
  border-top: 1px solid #2a2f33;
  box-shadow: 0 4px 6px rgba(0,0,0,0.2);
}
.mobile-nav.open {
  display: block;
}
.mobile-nav ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; }
.mobile-nav ul li a, .mobile-nav ul li.mobile-nav-action {
  display: block; padding: 15px 20px; color: white; text-decoration: none;
  border-bottom: 1px solid #2a2f33; font-size: 16px; transition: background-color 0.2s ease;
}
.mobile-nav ul li a:hover, .mobile-nav ul li.mobile-nav-action:hover { background-color: #2a2f33; color: #42b983; }

/* Стилі для додаткових дій в мобільному меню (якщо вони там будуть) */
.mobile-nav ul li.mobile-nav-action { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.mobile-nav ul li.mobile-nav-action img { width: 20px; height: 20px; filter: invert(1); }
.mobile-nav ul li.mobile-nav-action:hover img {
  filter: invert(59%) sepia(70%) saturate(456%) hue-rotate(96deg) brightness(94%) contrast(90%);
}
.mobile-nav ul li.nav-separator { height: 1px; background-color: #2a2f33; margin: 5px 0; padding: 0;}
.mobile-nav ul li a.profile-link {display: flex; align-items: center; gap: 10px;} /* Для посилання на профіль в мобільному меню, якщо воно там буде */
.mobile-nav ul li a.profile-link img { width: 20px; height: 20px; filter: invert(1); }
.mobile-nav ul li a.profile-link:hover img {
  filter: invert(59%) sepia(70%) saturate(456%) hue-rotate(96deg) brightness(94%) contrast(90%);
}

.unread-indicator.mobile-unread {
  position: static; /* Скидаємо абсолютне позиціонування */
  display: inline-block; /* Для розміщення поруч з текстом */
  margin-left: 5px; /* Невеликий відступ */
}

/* Адаптація для планшетів і менших екранів */
@media (max-width: 992px) { /* Точка перелому для показу гамбургера */
  .nav-links.desktop-nav {
    display: none; /* Ховаємо десктопну навігацію */
  }
  .hamburger-menu {
    display: block; /* Показуємо гамбургер */
  }
  .desktop-specific-icon { /* Ховаємо десктоп-специфічні іконки типу "баланс", "чат" */
    display: none;
  }
  .profile-logout-stack {
    display: none;
  }
  /* Ховаємо оригінальну кнопку "Вийти", що була поруч з іконкою профілю */
  .profile-container .logout-button .profile-icon-link .profile-icon{
    display: none !important;
  }
  .logout-button-stacked { /* Показуємо кнопку "Вийти" під іконкою профілю */
    display: block;
  }
  .auth-section {
    margin-left: auto; /* Притискає блок профілю/виходу вправо */
  }
}


@media (max-width: 768px) {

  .auth-section .balance-icon-container.desktop-specific-icon, /* Явно ховаємо, якщо ще не приховані */
  .auth-section .chat-icon-container.desktop-specific-icon {
    display: none;
  }
  .profile-icon { /* Зменшуємо іконки профілю/чату/балансу */
    width: 30px;
    height: 30px;
  }
  .profile-logout-stack {
    display: none;
  }
  .auth-button { /* Кнопка Реєстрація/Логін */
    font-size: 13px;
    padding: 7px 12px;
  }
}

@media (max-width: 480px) {
  .modal-content {
    width: 90%; /* Або calc(100% - 30px) */
    max-width: none; /* Прибираємо фіксований max-width */
    padding: 20px 15px;
  }
  .modal-content h3, .tabs button {
    font-size: 16px;
  }
  .form-group input, :deep(.vue-tel-input .vti__input) {
    font-size: 15px;
    padding: 10px;
  }
  .submit-button {
    font-size: 15px;
    padding: 10px;
  }

  .navbar {
    padding: 5px 10px; /* Менші відступи на дуже малих екранах */
    height: 50px;
  }
  .mobile-nav {
    top: 50px; /* Відповідно до нової висоти хедера */
  }
  .logo img {
    height: 50px;
    margin-right: 2px; /* Менший відступ від гамбургера */
  }
  .hamburger-menu {
    padding: 3px; /* Ще компактніше */
  }
  .profile-icon-link { /* Менша іконка профілю */
    width: 28px;
    height: 28px;
  }
  .profile-logout-stack {
    display: none;
  }
  .auth-button { /* Кнопка "Реєстрація/Логін" */
    font-size: 12px;
    padding: 6px 10px;
  }
}
</style>