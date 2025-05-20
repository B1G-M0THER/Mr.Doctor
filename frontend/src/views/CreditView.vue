<template>
  <div class="page request-loan-page">
    <h1>Подати заявку на кредит</h1>
    <p class="description">
      Потрібні кошти? Оформіть кредит у YB Bank швидко та на вигідних умовах!
      Заповніть форму нижче, і ми розглянемо вашу заявку.
    </p>

    <div v-if="!isLoggedIn" class="auth-warning">
      <p>Для подання заявки на кредит, будь ласка, <router-link to="/">увійдіть</router-link> в систему.</p>
    </div>

    <form v-else @submit.prevent="submitLoanApplication" class="loan-form">
      <div class="form-group">
        <label for="loanAmount">Бажана сума кредиту (UAH):</label>
        <input type="number" id="loanAmount" v-model.number="loanData.amount" placeholder="Наприклад, 10000" min="1000" max="1000000" step="100" required />
        <small>Мінімальна сума: 1,000 UAH, максимальна: 1,000,000 UAH.</small>
      </div>

      <div class="form-group">
        <label for="loanTerm">Термін кредитування (місяців):</label>
        <input type="number" id="loanTerm" v-model.number="loanData.termInMonths" placeholder="Наприклад, 12" min="3" max="120" step="1" required />
        <small>Мінімальний термін: 3 місяці, максимальний: 120 місяців.</small>
      </div>

      <div class="form-group interest-rate-info">
        <p>Орієнтовна відсоткова ставка: <strong>{{ displayedInterestRate }}% річних</strong></p>
        <small>(Точна ставка та умови будуть визначені після розгляду заявки адміністратором)</small>
      </div>

      <div v-if="submissionError" class="error-message main-error">
        {{ submissionError }}
      </div>
      <div v-if="submissionSuccessMessage" class="success-message main-success">
        {{ submissionSuccessMessage }}
      </div>

      <button type="submit" class="submit-button" :disabled="isLoading || !isLoggedIn">
        {{ isLoading ? 'Обробка...' : 'Подати заявку' }}
      </button>
    </form>
  </div>
</template>

<script>
import axios from 'axios';
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';

const DEFAULT_DISPLAY_INTEREST_RATE = 15.0;

export default {
  name: "CreditView",
  setup() {
    const router = useRouter();
    const loanData = ref({
      amount: null,
      termInMonths: null,
    });
    const displayedInterestRate = ref(DEFAULT_DISPLAY_INTEREST_RATE);
    const isLoading = ref(false);
    const submissionError = ref(null);
    const submissionSuccessMessage = ref(null);
    const isLoggedIn = ref(false);

    const checkLoginStatus = () => {
      const token = localStorage.getItem('token');
      isLoggedIn.value = !!token;
    };

    onMounted(() => {
      checkLoginStatus();
    });

    const submitLoanApplication = async () => {
      if (!isLoggedIn.value) {
        submissionError.value = "Будь ласка, увійдіть в систему, щоб подати заявку.";
        return;
      }
      if (!loanData.value.amount || !loanData.value.termInMonths) {
        submissionError.value = "Будь ласка, заповніть всі поля.";
        return;
      }
      if (loanData.value.amount < 1000 || loanData.value.amount > 1000000) {
        submissionError.value = "Сума кредиту має бути від 1,000 до 1,000,000 UAH.";
        return;
      }
      if (loanData.value.termInMonths < 3 || loanData.value.termInMonths > 120) {
        submissionError.value = "Термін кредиту має бути від 3 до 120 місяців.";
        return;
      }

      isLoading.value = true;
      submissionError.value = null;
      submissionSuccessMessage.value = null;

      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const payload = {
          amount: loanData.value.amount,
          termInMonths: loanData.value.termInMonths,
        };

        const response = await axios.post('/api/loans/apply', payload, { headers });

        submissionSuccessMessage.value = response.data.message || "Заявку на кредит успішно подано! Очікуйте на розгляд.";
        loanData.value.amount = null;
        loanData.value.termInMonths = null;

      } catch (error) {
        console.error("Помилка подання заявки на кредит:", error);
        submissionError.value = error.response?.data?.error || "Не вдалося подати заявку. Спробуйте пізніше.";
      } finally {
        isLoading.value = false;
      }
    };

    return {
      loanData,
      displayedInterestRate,
      isLoading,
      submissionError,
      submissionSuccessMessage,
      isLoggedIn,
      submitLoanApplication,
      checkLoginStatus,
    };
  }
};
</script>

<style scoped>
.request-loan-page {
  max-width: 600px;
  margin: 30px auto;
  padding: 25px 30px;
  background-color: rgb(55, 55, 55, 0.5);
  border: 1px solid #444;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  color: #f0f0f0;
  text-align: center;
}

h1 {
  color: #42b983;
  margin-bottom: 15px;
  font-size: 28px;
}

.description {
  font-size: 1em;
  color: #ccc;
  margin-bottom: 25px;
  line-height: 1.6;
}

.loan-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #cfd8dc;
  font-size: 14px;
  font-weight: 500;
}

.form-group input[type="number"] {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #444;
  border-radius: 5px;
  background-color: #333;
  color: #fff;
  box-sizing: border-box;
  font-size: 16px;
  height: 42px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
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

.interest-rate-info {
  background-color: rgba(66, 185, 131, 0.1);
  padding: 12px 15px;
  border-radius: 5px;
  border: 1px solid rgba(66, 185, 131, 0.3);
  text-align: center;
  margin-top: 5px;
}
.interest-rate-info p {
  margin: 0;
  color: #e0e0e0;
  font-size: 0.95em;
}
.interest-rate-info strong {
  color: #42b983;
}


.submit-button {
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
.submit-button:hover {
  background-color: #369966;
}
.submit-button:disabled {
  background-color: #3d3d3d;
  cursor: not-allowed;
}

.error-message.main-error,
.success-message.main-success {
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 0;
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
</style>