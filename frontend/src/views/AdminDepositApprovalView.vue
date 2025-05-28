<template>
  <div class="admin-page">
    <h1>Заявки на депозит (Очікують розгляду)</h1>
    <div v-if="isLoading" class="loading-message"><p>Завантаження заявок на депозит...</p></div>
    <div v-else-if="error" class="error-message"><p>{{ error }}</p></div>
    <div v-else-if="pendingDeposits.length === 0" class="no-requests"><p>Наразі немає активних заявок на депозит.</p></div>
    <div v-else class="requests-list">
      <table>
        <thead>
        <tr>
          <th>ID Заявки</th>
          <th>Користувач (Ім'я)</th>
          <th>Email</th>
          <th>Сума (UAH)</th>
          <th>Термін (міс.)</th>
          <th>Ставка (% річних)</th>
          <th>Дата заявки</th>
          <th>Дії</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="deposit in pendingDeposits" :key="deposit.id">
          <td>{{ deposit.id }}</td>
          <td>{{ deposit.Users.name }} (ID: {{ deposit.Users.id }})</td>
          <td>{{ deposit.Users.email }}</td>
          <td>{{ deposit.amount.toFixed(2) }}</td>
          <td>{{ deposit.term }}</td>
          <td>{{ deposit.interest_rate.toFixed(2) }}</td>
          <td>{{ new Date(deposit.created_at).toLocaleDateString('uk-UA') }} {{ new Date(deposit.created_at).toLocaleTimeString('uk-UA') }}</td>
          <td class="actions-cell">
            <button @click="processDepositDecision(deposit.id, 'approve')" class="action-button confirm" :disabled="deposit.isProcessing">
              {{ deposit.isProcessing && deposit.currentAction === 'approve' ? 'Обробка...' : 'Схвалити' }}
            </button>
            <button @click="processDepositDecision(deposit.id, 'reject')" class="action-button reject" :disabled="deposit.isProcessing">
              {{ deposit.isProcessing && deposit.currentAction === 'reject' ? 'Обробка...' : 'Відхилити' }}
            </button>
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter();
const pendingDeposits = ref([]);
const isLoading = ref(true);
const error = ref(null);

const fetchPendingDeposits = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      await router.push('/');
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    const response = await axios.get('/api/admin/deposits/pending', { headers });
    pendingDeposits.value = response.data.map(deposit => ({ ...deposit, isProcessing: false, currentAction: null }));
  } catch (err) {
    console.error("Помилка завантаження заявок на депозит:", err);
    error.value = err.response?.data?.error || "Не вдалося завантажити заявки на депозит.";
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userId');
      await router.push('/');
    }
  } finally {
    isLoading.value = false;
  }
};

const processDepositDecision = async (depositId, decisionAction) => {
  const deposit = pendingDeposits.value.find(d => d.id === depositId);
  if (deposit) {
    deposit.isProcessing = true;
    deposit.currentAction = decisionAction;
  }

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      alert("Сесія закінчилася. Будь ласка, увійдіть знову.");
      await router.push('/');
      if (deposit) deposit.isProcessing = false;
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    const payload = { decision: decisionAction };

    const response = await axios.post(`/api/admin/deposits/decide/${depositId}`, payload, { headers });
    alert(response.data.message || `Рішення '${decisionAction}' по заявці на депозит #${depositId} прийнято.`);
    pendingDeposits.value = pendingDeposits.value.filter(d => d.id !== depositId);

  } catch (err) {
    console.error(`Помилка при рішенні '${decisionAction}' по заявці на депозит #${depositId}:`, err);
    alert(err.response?.data?.error || `Не вдалося обробити заявку на депозит #${depositId}.`);
    if (deposit) {
      deposit.isProcessing = false;
      deposit.currentAction = null;
    }
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userId');
      await router.push('/');
    }
  }
};

onMounted(fetchPendingDeposits);

</script>

<style scoped>
/* Стилі аналогічні до AdminLoanApplicationsView.vue та AdminCardApproval.vue */
.admin-page {
  padding: 20px;
  max-width: 1200px;
  margin: 20px auto;
  background-color: #2c2c2c;
  border-radius: 8px;
  color: #f0f0f0;
}

h1 {
  text-align: center;
  color: #42b983;
  margin-bottom: 25px;
}

.loading-message,
.error-message,
.no-requests {
  text-align: center;
  padding: 20px;
  font-size: 1.1em;
  border-radius: 5px;
}

.error-message {
  color: #ff6b6b;
  background-color: rgba(255, 107, 107, 0.1);
  border: 1px solid #ff6b6b;
}

.no-requests {
  color: #ccc;
}

.requests-list { /* Обгортка для таблиці */
  overflow-x: auto; /* Дозволяє горизонтальну прокрутку */
  -webkit-overflow-scrolling: touch; /* Плавна прокрутка на iOS */
}

.requests-list table {
  min-width: 700px;
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  table-layout: auto; /* або fixed, якщо потрібно */
}

.requests-list th,
.requests-list td {
  border: 1px solid #444;
  padding: 10px 12px;
  text-align: left;
  font-size: 0.9em;
  vertical-align: middle;
  word-break: break-word;
}

.requests-list th {
  background-color: #383838;
  color: #42b983;
  font-weight: bold;
}

.requests-list tr:nth-child(even) {
  background-color: #333;
}

.requests-list tr:hover {
  background-color: #404040;
}

.actions-cell {
  display: flex;
  flex-direction: column; /* Або row, якщо кнопки мають бути в ряд */
  gap: 8px; /* Відстань між кнопками */
  align-items: stretch; /* Розтягує кнопки на всю ширину комірки, якщо column */
  /* min-width: 180px; */ /* Мінімальна ширина для комірки дій */
  text-align: center;
}

.action-button {
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 0.9em;
  width: 100%; /* Якщо flex-direction: column */
  text-align: center;
}

.action-button.confirm {
  background-color: #28a745;
}
.action-button.confirm:hover {
  background-color: #218838;
}

.action-button.reject {
  background-color: #dc3545;
  margin-top: 0; /* Якщо кнопки в стовпчик і є gap */
}
.action-button.reject:hover {
  background-color: #c82333;
}

.action-button:disabled {
  background-color: #555;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .admin-page {
    padding: 15px 10px;
  }
  h1 {
    font-size: 22px;
  }
  .requests-list th,
  .requests-list td {
    font-size: 0.85em; /* Трохи менший шрифт в таблиці */
    padding: 8px 6px;
  }
  .action-button {
    padding: 6px 8px;
    font-size: 0.8em;
    min-width: auto; /* Прибираємо мін ширину, щоб краще вміщались */
  }
  .actions-cell { /* Якщо кнопки в стовпчик */
    min-width: 120px; /* Мінімальна ширина для комірки з кнопками */
  }
}

@media (max-width: 480px) {
  .requests-list table {
    min-width: 600px; /* Можна ще зменшити, якщо деякі колонки не критичні */
  }
  .requests-list th,
  .requests-list td {
    white-space: nowrap; /* Щоб текст не переносився і не розтягував рядки по висоті */
  }
}
</style>