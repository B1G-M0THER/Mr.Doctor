<template>
  <div class="page">
    <h1>Чому саме ми?</h1>
    <p class="description">
      Ласкаво просимо до <strong>Mr.Doctor Bank</strong> – вашого надійного фінансового партнера!
      Ми пропонуємо швидке та безпечне відкриття карткового рахунку, вигідні умови обслуговування
      та цілодобову підтримку клієнтів.
    </p>
    <ul class="benefits">
      <li>💳 Безкоштовне відкриття картки</li>
      <li>🔒 Високий рівень безпеки</li>
      <li>💰 Кешбек до 10% на покупки</li>
      <li>📞 Цілодобова підтримка</li>
    </ul>

    <div v-if="cardStatus === 'waiting'" class="status-message">
      <h2>Ваша карта майже готова</h2>
      <p>⏱️ Очікуйте підтверження адміністратора на відкриття вашої карти карти.</p>
    </div>

    <div v-else-if="cardStatus === null">
      <h2>Подайте заявку прямо зараз</h2>
      <form @submit.prevent="submitForm" class="form">
        <p v-if="user.name"><strong>Ім'я:</strong> {{ user.name }}</p>
        <p v-if="user.email"><strong>Email:</strong> {{ user.email }}</p>
        <input v-model="pin" type="password" placeholder="Придумайте 4-значний PIN" required maxlength="4" minlength="4" class="input" />
        <button type="submit" :disabled="loading" class="button">
          {{ loading ? "Обробка..." : "Підтвердити" }}
        </button>
      </form>
      <p v-if="showPendingMessageAfterSubmit" class="success-message">
        Ваша карта майже готова!
        ⏱️ Очікуйте підтверження адміністратора на відкриття вашої карти карти.
      </p>
    </div>


    <div v-else class="status-message">
      <p>Банк YB дякує вам за співпрацю! Разом до успіху! 🚀💛</p>
    </div>

  </div>
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import api from '../api.js';
import Cards from '../../../backend/src/constants/cards';
import {useUiStore} from "../store/uiStore.js";

export default defineComponent({
  setup() {
    const uiStore = useUiStore();
    const user = ref({name: "", email: ""});
    const pin = ref("");
    const showPendingMessageAfterSubmit = ref(false);
    const loading = ref(false);
    const cardStatus = ref(undefined);
    const error = ref(null);

    async function fetchCardStatus() {
      const token = localStorage.getItem("token");
      if (!token) {
        cardStatus.value = null;
        return;
      }
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const response = await api.get("/api/cards/mycard", { headers });
        cardStatus.value = response.data.status;
      } catch (error) {
        if (error.response && error.response.status === 404) {
          cardStatus.value = null;
        } else {
          console.error("Помилка отримання статусу картки:", error);
          cardStatus.value = 'error';
          uiStore.addNotification({
            message: "Не вдалося перевірити статус вашої картки.",
            type: 'error'
          });
        }
      }
    }

    onMounted(async () => {
      const token = localStorage.getItem("token");

      await fetchCardStatus();

      if (token) {
        const headers = { Authorization: `Bearer ${token}` };
        api.get("/api/profile", { headers })
            .then((response) => {
              user.value.name = response.data.name || "";
              user.value.email = response.data.email || "";
            })
            .catch((profileError) => {
              console.error("Помилка завантаження профілю:", profileError);
              user.value.name = localStorage.getItem("name") || "";
              user.value.email = localStorage.getItem("email") || "";
            });
      }
    });

    async function submitForm() {
      error.value = null;
      loading.value = true;
      showPendingMessageAfterSubmit.value = false;

      if (!pin.value || pin.value.length !== 4 || isNaN(pin.value)) {
        uiStore.addNotification({
          message: "Будь ласка, введіть коректний 4-значний PIN.",
          type: 'error'
        });
        loading.value = false;
        return;
      }

      if (!user.value.name || !user.value.email) {
        uiStore.addNotification({
          message: "Дані користувача (ім'я або email) не завантажені!",
          type: 'error'
        });
        loading.value = false;
        return;
      }

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          uiStore.addNotification({
            message: "Помилка автентифікації. Спробуйте увійти знову.",
            type: 'error'
          });
          loading.value = false;
          return;
        }

        const response = await api.post("/api/cards/create", {
          token: token,
          pin: pin.value
        });

        localStorage.setItem("token", response.data.token);

        showPendingMessageAfterSubmit.value = true;

        cardStatus.value = Cards.waiting;

      } catch (submitError) {
        uiStore.addNotification({
          message: submitError.response?.data?.error || "Помилка створення картки",
          type: 'error'
        });
        error.value = submitError.response?.data?.error || "Помилка створення картки";
      } finally {
        loading.value = false;
      }
    }

    return { user, pin, submitForm, loading, error, cardStatus, showPendingMessageAfterSubmit };
  },
});
</script>

<style scoped>
.page {
  text-align: center;
  padding: 50px 20px;
  max-width: 500px;
  margin: 0 auto;
  border-radius: 12px;
}

h1 {
  font-size: 32px;
  margin-bottom: 20px;
  font-weight: 600;
}

p {
  font-size: 16px;
  color: #cfd8dc;
  margin-bottom: 20px;
}

.description {
  margin-bottom: 30px;
}

.benefits {
  list-style: none;
  padding-block: 35px;
  margin-bottom: 20px;
}

.benefits li {
  font-size: 24px;
  margin-bottom: 20px;
  color: #ffffff;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  border-radius: 12px;
  padding: 20px;
  width: 100%;
  background: rgb(44, 44, 44, 0.5);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.input {
  background: rgb(55, 55, 55, 0.5);
  border: 1px solid #444;
  color: #ffffff;
  padding: 12px;
  font-size: 16px;
  border-radius: 8px;
  outline: none;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.button {
  background: #26b983;
  color: #ffffff;
  border: none;
  padding: 12px;
  font-size: 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.button:disabled {
  background-color: #3d3d3d;
  cursor: not-allowed;
}

.button:hover {
  background-color: #369966;
}

.success-message {
  font-size: 16px;
  margin-top: 20px;
  color: #ffffff;
  padding: 15px;
  background-color: rgb(55, 55, 55, 0.5);
  border: 1px solid #444;
  border-radius: 8px;
}

.status-message {
  margin-top: 30px;
  padding: 20px;
  background-color: rgb(55, 55, 55, 0.5);
  border: 1px solid #444;
  border-radius: 8px;
  color: #e0e0e0;
}

.status-message h2 {
  color: #42b983;
  margin-bottom: 10px;
}

.button-link {
  display: inline-block;
  margin-top: 15px;
  background: #42b983;
  color: #ffffff;
  border: none;
  padding: 10px 20px;
  font-size: 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
  text-decoration: none;
}

.button-link:hover {
  background-color: #369966;
}
</style>
