<template>
  <div class="page deposit-page">
    <h1>Депозити в YB Bank</h1>
    <p class="description">
      Збільшуйте свої заощадження з нашими вигідними депозитними програмами.
      Скористайтеся калькулятором для попереднього розрахунку або одразу переходьте до оформлення.
    </p>

    <div class="deposit-calculator card-style">
      <h2>Калькулятор депозиту</h2>
      <div class="form-group">
        <label for="calcAmount">Сума вкладу (UAH):</label>
        <input type="number" id="calcAmount" v-model.number="calculator.amount" placeholder="Наприклад, 10000" min="100" step="100" />
      </div>
      <div class="form-group">
        <label for="calcTerm">Термін (місяців):</label>
        <input type="number" id="calcTerm" v-model.number="calculator.term" placeholder="Наприклад, 12" min="3" max="36" step="1" />
      </div>
      <div class="form-group">
        <label>Орієнтовна річна ставка:</label>
        <p class="static-rate">{{ preDefinedInterestRate.toFixed(2) }}%</p>
      </div>
      <button @click="calculateDeposit" class="calculate-button" :disabled="!calculator.amount || !calculator.term">Розрахувати</button>

      <div v-if="calculator.result" class="calculation-result">
        <h4>Результат розрахунку:</h4>
        <p>Ви вклали: <strong>{{ calculator.amountInput.toFixed(2) }} UAH</strong></p>
        <p>Термін: <strong>{{ calculator.termInput }} міс.</strong></p>
        <p>Нараховані відсотки: <strong style="color: #42b983;">{{ calculator.result.interest.toFixed(2) }} UAH</strong></p>
        <p>Загалом ви отримаєте: <strong style="color: #42b983;">{{ calculator.result.total.toFixed(2) }} UAH</strong></p>
        <small>(Це попередній розрахунок. Точні умови будуть визначені при оформленні.)</small>
      </div>
    </div>

    <div class="deposit-application-form card-style">
      <h2>Оформити депозит</h2>
      <div v-if="!isLoggedIn" class="auth-warning prominent-warning">
        <p>Для оформлення депозиту, будь ласка, <router-link to="/">увійдіть</router-link> в систему.</p>
      </div>
      <div v-else-if="isLoadingCardDetails" class="loading-message page-loading">
        <p>Перевірка статусу вашої картки...</p>
      </div>
      <div v-else-if="cardMessage" class="auth-warning prominent-warning">
        <p>{{ cardMessage }}</p>
        <p v-if="!userCard || userCard.status !== 'active'">
          <router-link v-if="!userCard" to="/open-card">Відкрити картку</router-link>
          <router-link v-else to="/profile">Перейти до профілю картки</router-link>
        </p>
      </div>

      <form v-else-if="canApplyForDeposit" @submit.prevent="submitDepositApplication">
        <div class="form-group">
          <label for="depositAmount">Сума депозиту (UAH):</label>
          <input type="number" id="depositAmount" v-model.number="depositData.amount" placeholder="Наприклад, 10000" min="100" max="1000000" step="100" required />
          <small>Мінімальна сума: 100 UAH, максимальна: 1,000,000 UAH.</small>
        </div>
        <div class="form-group">
          <label for="depositTerm">Термін депозиту (місяців):</label>
          <input type="number" id="depositTerm" v-model.number="depositData.termInMonths" placeholder="Наприклад, 12" min="3" max="36" step="1" required />
          <small>Мінімальний термін: 3 місяці, максимальний: 36 місяців.</small>
        </div>
        <div class="form-group interest-rate-info">
          <p>Річна відсоткова ставка: <strong>{{ preDefinedInterestRate.toFixed(2) }}%</strong></p>
        </div>

        <div v-if="depositStore.error" class="error-message main-error">
          {{ depositStore.error }}
        </div>
        <div v-if="depositStore.applicationMessage" class="success-message main-success">
          {{ depositStore.applicationMessage }}
        </div>

        <button type="submit" class="submit-button" :disabled="depositStore.isLoading || !canApplyForDeposit">
          {{ depositStore.isLoading ? 'Обробка...' : 'Подати заявку на депозит' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useDepositStore } from '../store/depositStore';
import api from '../api.js'; // Для перевірки картки

const depositStore = useDepositStore();

const preDefinedInterestRate = ref(10.0); // Фіксована ставка 10%

const calculator = reactive({
  amount: null,
  term: null,
  amountInput: 0, // Для збереження введеної суми для відображення
  termInput: 0,   // Для збереження введеного терміну
  result: null,
});

const depositData = ref({
  amount: null,
  termInMonths: null,
});

const isLoggedIn = ref(false);
const userCard = ref(null);
const isLoadingCardDetails = ref(false);
const cardError = ref(null);


const checkLoginAndCardStatus = async () => {
  const token = localStorage.getItem('token');
  isLoggedIn.value = !!token;

  if (isLoggedIn.value) {
    isLoadingCardDetails.value = true;
    cardError.value = null;
    userCard.value = null;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await api.get('/api/cards/mycard', { headers });
      if (response.data && response.data.id) {
        userCard.value = response.data;
      } else {
        userCard.value = null;
      }
    } catch (error) {
      console.error("Помилка завантаження даних картки для депозиту:", error);
      if (error.response && error.response.status === 404) {
        userCard.value = null;
      } else {
        cardError.value = error.response?.data?.message || "Не вдалося перевірити статус вашої картки.";
      }
    } finally {
      isLoadingCardDetails.value = false;
    }
  }
};

onMounted(() => {
  checkLoginAndCardStatus();
  // Очищаємо повідомлення зі стору при завантаженні сторінки, щоб не показувати старі
  depositStore.applicationMessage = null;
  depositStore.error = null;
});

const canApplyForDeposit = computed(() => {
  return isLoggedIn.value && userCard.value && userCard.value.status === 'active' && !isLoadingCardDetails.value;
});

const cardMessage = computed(() => {
  if (!isLoggedIn.value || isLoadingCardDetails.value) {
    return null;
  }
  if (cardError.value) {
    return cardError.value;
  }
  if (!userCard.value) {
    return "Для оформлення депозиту вам необхідно мати картку нашого банку.";
  }
  if (userCard.value.status !== 'active') {
    let statusText = userCard.value.status;
    if (statusText === 'waiting') statusText = 'очікує активації';
    else if (statusText === 'expired') statusText = 'прострочена';
    else if (statusText === 'blocked') statusText = 'заблокована';
    else if (statusText === 'renewal_pending') statusText = 'очікує поновлення';
    return `Ваша картка наразі "${statusText}". Депозит можна оформити лише з активною карткою.`;
  }
  if (userCard.value.balance < (depositData.value.amount || 0) && depositData.value.amount) {
    return `Недостатньо коштів на вашій активній картці. Потрібно ${depositData.value.amount.toFixed(2)} UAH, доступно ${userCard.value.balance.toFixed(2)} UAH.`
  }
  return null;
});


function calculateDeposit() {
  if (calculator.amount > 0 && calculator.term > 0) {
    const principal = calculator.amount;
    const months = calculator.term;
    const annualRate = preDefinedInterestRate.value / 100;

    // Простий відсоток: I = P * R_місячна * T_місяців
    const monthlyRate = annualRate / 12;
    const interest = principal * monthlyRate * months;
    const total = principal + interest;

    calculator.amountInput = principal; // Зберігаємо введену суму
    calculator.termInput = months;     // Зберігаємо введений термін
    calculator.result = {
      interest: interest,
      total: total,
    };
  } else {
    calculator.result = null;
  }
}

async function submitDepositApplication() {
  depositStore.applicationMessage = null; // Очищаємо попередні повідомлення
  depositStore.error = null;

  if (!depositData.value.amount || !depositData.value.termInMonths) {
    depositStore.error = "Будь ласка, заповніть всі поля для депозиту.";
    return;
  }
  if (depositData.value.amount < 100 ) {
    depositStore.error = "Мінімальна сума депозиту 100 UAH.";
    return;
  }
  if (depositData.value.termInMonths < 3 || depositData.value.termInMonths > 36 ) {
    depositStore.error = "Термін депозиту від 3 до 36 місяців.";
    return;
  }
  if (userCard.value && userCard.value.balance < depositData.value.amount) {
    depositStore.error = `Недостатньо коштів на вашій активній картці для відкриття депозиту. Потрібно ${depositData.value.amount.toFixed(2)} UAH.`;
    return;
  }


  const success = await depositStore.applyForDeposit({
    amount: depositData.value.amount,
    termInMonths: depositData.value.termInMonths,
  });

  if (success) {
    depositData.value.amount = null;
    depositData.value.termInMonths = null;
    // calculator.result = null; // Очистити результати калькулятора, якщо потрібно
    // Заявка відправлена, повідомлення покажеться зі стору
  }
}
</script>

<style scoped>
.deposit-page {
  max-width: 700px;
  margin: 30px auto;
  padding: 25px 30px;
  color: #f0f0f0;
  text-align: center;
}

h1 {
  color: #42b983;
  margin-bottom: 15px;
}
.description {
  font-size: 1em;
  color: #ccc;
  margin-bottom: 30px;
  line-height: 1.6;
}

.card-style {
  background-color: rgb(55, 55, 55, 0.5);
  border: 1px solid #444;
  border-radius: 8px;
  padding: 20px 25px;
  margin-bottom: 30px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.deposit-calculator h2,
.deposit-application-form h2 {
  color: #e0e0e0;
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.5em;
  border-bottom: 1px solid #4a4a4a;
  padding-bottom: 10px;
}

.form-group {
  text-align: left;
  margin-bottom: 18px;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #cfd8dc;
  font-size: 14px;
  font-weight: 500;
}
.form-group input[type="number"], .form-group .static-rate {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #444;
  border-radius: 5px;
  background-color: #333;
  color: #fff;
  box-sizing: border-box;
  font-size: 16px;
  height: 42px;
}
.form-group .static-rate {
  line-height: 20px; /* Для вирівнювання тексту як в input */
  color: #42b983;
  font-weight: bold;
}
.form-group input[type="number"]:focus {
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66,185,131,0.3);
  outline: none;
}
.form-group small {
  font-size: 0.8em;
  color: #aaa;
  display: block;
  margin-top: 5px;
}

.calculate-button, .submit-button {
  background-color: #42b983;
  padding: 12px 25px;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: background-color 0.3s ease;
  width: 100%;
  margin-top: 10px;
}
.calculate-button:hover, .submit-button:hover {
  background-color: #369966;
}
.calculate-button:disabled, .submit-button:disabled {
  background-color: #3d3d3d;
  cursor: not-allowed;
}

.calculation-result {
  margin-top: 20px;
  padding: 15px;
  background-color: rgba(40, 40, 40, 0.7);
  border-radius: 5px;
  border: 1px solid #4a4a4a;
  text-align: left;
}
.calculation-result h4 {
  color: #42b983;
  margin-top: 0;
  margin-bottom: 10px;
}
.calculation-result p {
  font-size: 0.95em;
  color: #e0e0e0;
  margin: 5px 0;
}
.calculation-result small {
  font-size: 0.8em;
  color: #aaa;
  display: block;
  margin-top: 10px;
}

.interest-rate-info {
  background-color: rgba(66, 185, 131, 0.1);
  padding: 10px 15px;
  border-radius: 5px;
  border: 1px solid rgba(66, 185, 131, 0.3);
  text-align: center;
  margin-bottom: 20px;
}
.interest-rate-info p { margin: 0; color: #e0e0e0; font-size: 0.95em; }
.interest-rate-info strong { color: #42b983; }

.error-message.main-error,
.success-message.main-success {
  padding: 12px;
  border-radius: 5px;
  margin-top: 15px; /* Додав відступ зверху */
  margin-bottom: 10px;
  font-size: 14px;
  text-align: center;
}
.error-message.main-error {
  color: #ff6b6b;
  background-color: rgba(255,107,107,0.1);
  border: 1px solid rgba(255,107,107,0.3);
}
.success-message.main-success {
  color: #42b983;
  background-color: rgba(66,185,131,0.1);
  border: 1px solid rgba(66,185,131,0.3);
}

.auth-warning {
  margin-top: 20px;
  padding: 15px;
  background-color: rgba(240, 173, 78, 0.1);
  border: 1px solid rgba(240, 173, 78, 0.3);
  color: #f0ad4e;
  font-size: 0.95em;
  border-radius: 5px;
}
.auth-warning a {
  color: #42b983;
  text-decoration: underline;
  font-weight: bold;
}
.auth-warning a:hover {
  color: #52d89f;
}
.page-loading p {
  font-style: italic;
  color: #aaa;
}

@media (max-width: 768px) {
  .deposit-page{ /* Загальний клас сторінки */
    padding: 20px 15px;
  }
  h1 {
    font-size: 26px;
  }
  .description {
    font-size: 0.95em;
  }
  .card-style { /* Стиль обгортки для калькулятора/форми */
    padding: 15px;
  }
  .form-group input[type="number"], .form-group .static-rate {
    font-size: 15px;
  }
  .calculate-button, .submit-button {
    font-size: 15px;
    padding: 10px 20px;
  }
}
</style>