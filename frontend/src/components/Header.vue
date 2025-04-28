<template>
  <header class="navbar">
    <div class="logo">
      <img src="../assets/logo.png" alt="Vue Logo" />
    </div>
    <nav class="nav-links">
      <ul>
        <li><router-link to="/">Головна</router-link></li>
        <li><router-link to="/deposit">Депозити</router-link></li>
        <li><router-link to="/open-card">Відкрити карту</router-link></li>
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
          <!-- Show admin profile icons if role is 'ADMIN' -->
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

    <!-- Модальное окно Логин/Регистрация -->
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
  </header>
</template>

<script>
import { ref } from "vue";
import { VueTelInput } from "vue-tel-input";
import axios from "axios";

export default {
  components: { VueTelInput },
  setup() {
    const showRegisterModal = ref(false);
    const isRegistrationMode = ref(true);
    const email = ref("");
    const name = ref("");
    const phone = ref("");
    const password = ref("");
    const isLoggedIn = ref(!!localStorage.getItem("token"));
    const role = ref(localStorage.getItem("role"));

    const closeModal = () => {
      showRegisterModal.value = false;
    };

    axios.interceptors.request.use(
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

    const switchMode = (isRegister) => {
      isRegistrationMode.value = isRegister;
      email.value = "";
      password.value = "";
      name.value = "";
      phone.value = "";
    };

    const register = async () => {

      const nameRegex = /^[a-zA-Z]{2,}\s[a-zA-Z]{3,}$/;
      if (!nameRegex.test(name.value)) {
        alert(
            "Будь ласка, введіть ім'я (мінімум 2 літери) та прізвище (мінімум 3 літери) латиницею. Наприклад: John Smith."
        );
        return;
      }

      // Валідація електронної пошти
      const emailRegex = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/iu;
      if (!emailRegex.test(email.value)) {
        alert("Будь ласка, введіть коректну електронну пошту.");
        return;
      }
      try {
        await axios.post("/api/register", {
          name: name.value,
          email: email.value,
          phone_number: phone.value,
          password: password.value,
        });
        closeModal();
      } catch (error) {
        alert(error.response?.data?.error || "Помилка реєстрації.");
      }
    };

    const login = async () => {
      try {
        const response = await axios.post("/api/login", {
          email: email.value,
          password: password.value,
        });
        localStorage.setItem("token", response.data.token); // Save token
        localStorage.setItem("role", response.data.role);  // Save user role
        isLoggedIn.value = true; // Update login status
        role.value = response.data.role; // Update role
        closeModal();
      } catch (error) {
        alert(error.response?.data?.error || "Помилка входу.");
      }
    };


    const logout = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      isLoggedIn.value = false;
      role.value = "";
      window.location.href = "/"; // Перенаправляем на главную страницу
    };

    return {
      showRegisterModal,
      isRegistrationMode,
      email,
      name,
      phone,
      password,
      role,
      isLoggedIn,
      closeModal,
      switchMode,
      register,
      login,
      logout,
    };
  },
};
</script>

<style scoped>
/* Основной стиль */
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
}

.profile-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.logout-button {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: color 0.3s ease;
  position: relative;
  padding-bottom: 5px;
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
  width: 40px;
  height: 40px;
}

.profile-img {
  position: absolute;
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


.logo img {
  height: 84px;
}

.nav-links {
  flex-grow: 1;
  text-align: right;
}

.nav-links ul {
  list-style: none;
  display: flex;
  justify-content: flex-end;
  gap: 15px;
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
}

.nav-links ul li a::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 50%;
  width: 0;
  height: 2px;
  background-color: #42b983;
  transition: width 0.3s ease, left 0.3s ease;
  transform: translateX(0%);
}

.nav-links ul li a:hover {
  color: #42b983;
}

.nav-links ul li a:hover::after {
  width: 100%;
  left: 0;
}

.auth-section {
  margin-left: 40px;
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

/* Стили модального окна */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: #1a1a1a;
  color: #ffffff;
  width: 400px;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  position: relative;
  text-align: center;
}

.close-icon {
  position: absolute;
  top: 10px;
  right: 20px;
  font-size: 24px;
  color: #ffffff;
  cursor: pointer;
}

.tabs {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 20px;
}

.tabs button {
  background-color: transparent;
  border: none;
  color: #ffffff;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  padding-bottom: 5px;
  border-bottom: 2px solid transparent;
}

.tabs button.active {
  border-color: #42b983;
}

.form-group {
  text-align: left;
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #cfd8dc;
}

.form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #444;
  border-radius: 5px;
  background-color: #333;
  color: #fff;
  max-width: 250px;
  max-height: 35px;
}

.submit-button {
  background-color: #42b983;
  padding: 10px 20px;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

/* Применяем ко всему контейнеру vue-tel-input */
:deep(.vue-tel-input) {
  background-color: #333 !important; /* Фон всего контейнера */
  border-radius: 5px !important; /* Радиус углов */
  padding: 2px !important; /* Внешние отступы */
  color: #fff !important;
  border: 1px solid #444 !important; /* Обводка */
  width: 100% !important;
  max-width: 262px !important;
  box-shadow: none !important; /* Убираем лишние тени */
}

:deep(.vue-tel-input input) {
  background-color: #333 !important; /* Фон для input */
  color: #fff !important; /* Белый текст */
  border: none !important; /* Полностью убираем стандартную рамку */
  outline: none !important; /* Убираем стандартный фокус */
  font-size: 13px !important;
  width: 100% !important;
}

:deep(.vue-tel-input input:focus) {
  border: none !important; /* Убираем границу при фокусе */
  box-shadow: none !important; /* Убираем лишние тени при фокусе */
  outline: none !important; /* Убираем стандартный фокусный эффект */
}

/* Фон для дропдауна выбора страны */
:deep(.vue-tel-input .vti__dropdown) {
  background-color: #333 !important; /* Устанавливаем фон #333 */
  color: #fff; /* Изменяем цвет текста для контраста */
  border: none !important;
}

:deep(.vue-tel-input input::placeholder) {
  color: #aaa;
  opacity: 0.7;
}

/* Если есть дополнительная обводка, на уровне wrapper */
:deep(.vue-tel-input-wrapper) {
  background-color: transparent !important; /* Убираем фоновый цвет wrapper */
  border: none !important; /* Убираем границу wrapper */
  box-shadow: none !important; /* Убираем теневые эффекты от библиотеки */
}
/* Стили для всех стран в меню */
:deep(.vti__dropdown-item) {
  background-color: #333 !important; /* Устанавливаем фон у всех стран */
  color: #fff; /* Белый текст для читаемости */
}

/* Стили для hover-эффекта (при наведении мышки) */
:deep(.vti__dropdown-item:hover) {
  background-color: #444 !important; /* Более светлый фон при наведении */
  color: #fff; /* Белый текст сохраняем */
}

</style>
