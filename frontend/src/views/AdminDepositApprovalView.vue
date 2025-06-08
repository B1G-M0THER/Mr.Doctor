<template>
  <div class="admin-page">
    <h1>Заявки на депозит (Очікують розгляду)</h1>

    <div class="search-bar-container">
      <input
          type="text"
          v-model="searchTerm"
          placeholder="Пошук за іменем або email..."
          class="search-input"
      />
    </div>

    <div v-if="isLoading" class="loading-message"><p>Завантаження заявок на депозит...</p></div>
    <div v-else-if="error" class="error-message"><p>{{ error }}</p></div>
    <div v-else-if="filteredDeposits.length === 0" class="no-requests"><p>Наразі немає активних заявок на депозит.</p></div>
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
        <tr v-for="deposit in filteredDeposits" :key="deposit.id">
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
import { ref, onMounted,computed } from 'vue';
import api from '../api.js';
import { useRouter } from 'vue-router';
import {useUiStore} from "../store/uiStore.js";

const router = useRouter();
const pendingDeposits = ref([]);
const isLoading = ref(true);
const error = ref(null);
const uiStore = useUiStore();
const searchTerm = ref('');

const filteredDeposits = computed(() => {
  if (!searchTerm.value) {
    return pendingDeposits.value;
  }
  const lowerCaseSearch = searchTerm.value.toLowerCase();
  return pendingDeposits.value.filter(deposit =>
      deposit.Users.name.toLowerCase().includes(lowerCaseSearch) ||
      deposit.Users.email.toLowerCase().includes(lowerCaseSearch)
  );
});

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
    const response = await api.get('/api/admin/deposits/pending', { headers });
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
      uiStore.addNotification({
        message: "Сесія закінчилася. Будь ласка, увійдіть знову.",
        type: 'error'
      });
      await router.push('/');
      if (deposit) deposit.isProcessing = false;
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    const payload = { decision: decisionAction };

    const response = await api.post(`/api/admin/deposits/decide/${depositId}`, payload, { headers });
    uiStore.addNotification({
      message: response.data.message || `Рішення '<span class="math-inline">\{decisionAction\}' по заявці на депозит \#</span>{depositId} прийнято.`,
      type: 'success'
    });
    pendingDeposits.value = pendingDeposits.value.filter(d => d.id !== depositId);

  } catch (err) {
    console.error(`Помилка при рішенні '${decisionAction}' по заявці на депозит #${depositId}:`, err);
    uiStore.addNotification({
      message: err.response?.data?.error || `Не вдалося обробити заявку на депозит #${depositId}.`,
      type: 'error'
    });
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
.search-bar-container {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

.search-input {
  width: 100%;
  max-width: 400px;
  padding: 8px 12px;
  border: 1px solid #444;
  border-radius: 5px;
  background-color: #333;
  color: #fff;
  font-size: 15px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.search-input:focus {
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66,185,131,0.3);
  outline: none;
}
.search-input::placeholder {
  color: #888;
}

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

.requests-list {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.requests-list table {
  min-width: 700px;
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  table-layout: auto;
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
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
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
  width: 100%;
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
  margin-top: 0;
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
    font-size: 0.85em;
    padding: 8px 6px;
  }
  .action-button {
    padding: 6px 8px;
    font-size: 0.8em;
    min-width: auto;
  }
  .actions-cell {
    min-width: 120px;
  }
}

@media (max-width: 480px) {
  .requests-list table {
    min-width: 600px;
  }
  .requests-list th,
  .requests-list td {
    white-space: nowrap;
  }
}
</style>