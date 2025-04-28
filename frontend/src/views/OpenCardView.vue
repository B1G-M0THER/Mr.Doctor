<template xmlns:strongEmail="http://www.w3.org/1999/html">
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

    <h2>Подайте заявку прямо зараз</h2>
    <form @submit.prevent="submitForm" class="form">
      <p v-if="user.name"><strong>Ім'я:</strong> {{ user.name }}</p>
      <p v-if="user.email"><strong>Email:</strong> {{ user.email }}</p>
      <input v-model="pin" type="password" placeholder="Придумайте 4-значний PIN" required maxlength="4" class="input" />
      <button type="submit" :disabled="loading" class="button">
        {{ loading ? "Обробка..." : "Підтвердити" }}
      </button>
    </form>
    <p v-if="cardNumber" class="success-message">
      Ваша карта майже готова
      ⏱️ Очікуйте підтверження адміністратора на підтвердження карти.
    </p>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import axios from "axios";

export default defineComponent({
  setup() {
    const user = ref({name: "", email: ""});
    const pin = ref("");
    const cardNumber = ref(null);
    const loading = ref(false);
    const error = ref(null);

    // Отримуємо дані користувача з localStorage
    onMounted(() => {
      user.value.name = localStorage.getItem("name") || "";
      user.value.email = localStorage.getItem("email") || "";

      // Якщо токен є, запитуємо додаткові дані з сервера
      const token = localStorage.getItem("token");
      if (token) {
        const headers = { Authorization: `Bearer ${token}` };
        axios.get("http://localhost:4000/api/profile", { headers })
            .then((response) => {
              user.value.name = response.data.name || user.value.name; // Оновлюємо, якщо доступно
              user.value.email = response.data.email || user.value.email; // Оновлюємо, якщо доступно
            })
            .catch((error) => {
              console.error("Помилка завантаження користувача:", error);
            });
      }
    });

    async function submitForm() {
      error.value = null;
      loading.value = true;

      if (!user.value.name || !user.value.email) {
        alert("Ім'я або email користувача не знайдені!");
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const response = await axios.post("http://localhost:4000/api/cards/create", {
          token: token,
          pin: pin.value
        });

        cardNumber.value = response.data.cardNumber;
        localStorage.setItem("token", response.data.token);
        console.log(response.data.token, localStorage.getItem("token") );
      } catch (error) {
        alert(error.response?.data?.error || "Помилка створення картки");
      } finally {
        loading.value = false;
      }
    }

    return { user, pin, submitForm, cardNumber, loading, error };
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
}
</style>
