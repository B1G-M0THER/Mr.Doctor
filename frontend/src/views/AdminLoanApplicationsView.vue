<template>
  <div class="admin-page">
    <h1>Заявки на кредит (Очікують розгляду)</h1>
    <div v-if="isLoading" class="loading-message"><p>Завантаження заявок...</p></div>
    <div v-else-if="error" class="error-message"><p>{{ error }}</p></div>
    <div v-else-if="pendingLoans.length === 0" class="no-requests"><p>Наразі немає активних заявок на кредит.</p></div>
    <div v-else class="requests-list">
      <table>
        <thead>
        <tr>
          <th>ID Заявки</th>
          <th>Користувач (Ім'я)</th>
          <th>Email</th>
          <th>Сума (UAH)</th>
          <th>Термін (міс.)</th>
          <th>Запропонована ставка (%)</th>
          <th>Дата заявки</th>
          <th>Дії</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="loan in pendingLoans" :key="loan.id">
          <td>{{ loan.id }}</td>
          <td>{{ loan.Users.name }} (ID: {{ loan.Users.id }})</td>
          <td>{{ loan.Users.email }}</td>
          <td>{{ loan.amount.toFixed(2) }}</td>
          <td>{{ loan.term }}</td>
          <td>{{ loan.interest_rate.toFixed(2) }}</td>
          <td>{{ new Date(loan.created_at).toLocaleDateString('uk-UA') }} {{ new Date(loan.created_at).toLocaleTimeString('uk-UA') }}</td>
          <td class="actions-cell">
            <button @click="openApproveConfirmationModal(loan)" class="action-button confirm" :disabled="loan.isProcessing">
              {{ loan.isProcessing && loan.currentAction === 'approve' ? 'Обробка...' : 'Схвалити' }}
            </button>
            <button @click="processLoanDecision(loan.id, 'reject')" class="action-button reject" :disabled="loan.isProcessing">
              {{ loan.isProcessing && loan.currentAction === 'reject' ? 'Обробка...' : 'Відхилити' }}
            </button>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showApproveModal && selectedLoan" class="modal-overlay" @click.self="closeApproveConfirmationModal">
      <div class="modal-content">
        <span class="close-icon" @click="closeApproveConfirmationModal">&times;</span>
        <h3>Схвалення кредиту #{{ selectedLoan.id }}</h3>
        <p><strong>Користувач:</strong> {{ selectedLoan.Users.name }} ({{selectedLoan.Users.email}})</p>
        <div class="loan-details-review">
          <p><strong>Запит:</strong> {{ selectedLoan.amount.toFixed(2) }} UAH на {{ selectedLoan.term }} міс.</p>
          <p><strong>Відсоткова ставка (незмінна):</strong> {{ selectedLoan.interest_rate.toFixed(2) }}%</p>
        </div>
        <p class="confirmation-question">Ви впевнені, що хочете схвалити цей кредит на зазначених умовах та зарахувати кошти на картку користувача?</p>

        <div v-if="decisionErrorInModal" class="error-message">{{ decisionErrorInModal }}</div>

        <div class="modal-actions">
          <button @click="processLoanDecision(selectedLoan.id, 'approve')" class="submit-button confirm-action-btn" :disabled="isLoadingDecision || (selectedLoan && selectedLoan.isProcessing)">
            {{ (selectedLoan && selectedLoan.isProcessing && selectedLoan.currentAction === 'approve') || isLoadingDecision ? 'Обробка...' : 'Так, схвалити' }}
          </button>
          <button @click="closeApproveConfirmationModal" class="submit-button cancel-action-btn" :disabled="isLoadingDecision || (selectedLoan && selectedLoan.isProcessing)">
            Скасувати
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../api.js';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {useUiStore} from "../store/uiStore.js";

export default {
  name: 'AdminLoanApplicationsView',
  setup() {
    const router = useRouter();
    const pendingLoans = ref([]);
    const isLoading = ref(true);
    const error = ref(null);
    const showApproveModal = ref(false);
    const selectedLoan = ref(null);
    const decisionErrorInModal = ref(null);
    const isLoadingDecision = ref(false);
    const uiStore = useUiStore();

    const fetchPendingLoans = async () => {
      isLoading.value = true;
      error.value = null;
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          await router.push('/');
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        const response = await api.get('/api/admin/loans/pending', { headers });
        pendingLoans.value = response.data.map(loan => ({ ...loan, isProcessing: false, currentAction: null }));
      } catch (err) {
        console.error("Помилка завантаження заявок на кредит:", err);
        error.value = err.response?.data?.error || "Не вдалося завантажити заявки.";
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          await router.push('/');
        }
      } finally {
        isLoading.value = false;
      }
    };

    const openApproveConfirmationModal = (loan) => {
      selectedLoan.value = { ...loan };
      decisionErrorInModal.value = null;
      showApproveModal.value = true;
    };

    const closeApproveConfirmationModal = () => {
      showApproveModal.value = false;
      selectedLoan.value = null;
    };

    const processLoanDecision = async (loanId, decisionAction) => {
      const loanInList = pendingLoans.value.find(l => l.id === loanId);
      const currentProcessingLoan = selectedLoan.value && selectedLoan.value.id === loanId ? selectedLoan.value : loanInList;


      if (currentProcessingLoan) {
        currentProcessingLoan.isProcessing = true;
        currentProcessingLoan.currentAction = decisionAction;
      }
      isLoadingDecision.value = true;
      if (decisionAction === 'approve') decisionErrorInModal.value = null;


      try {
        const token = localStorage.getItem('token');
        if (!token) {
          uiStore.addNotification({
            message: "Сесія закінчилася. Будь ласка, увійдіть знову.",
            type: 'error'
          });
          await router.push('/');
          if (currentProcessingLoan) currentProcessingLoan.isProcessing = false;
          isLoadingDecision.value = false;
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        const payload = { decision: decisionAction };

        const response = await api.post(`/api/admin/loans/decide/${loanId}`, payload, { headers });
        uiStore.addNotification({
          message: response.data.message || `Рішення '<span class="math-inline">\{decisionAction\}' по заявці \#</span>{loanId} прийнято.`,
          type: 'success'
        });
        pendingLoans.value = pendingLoans.value.filter(l => l.id !== loanId);

        if (showApproveModal.value && selectedLoan.value && selectedLoan.value.id === loanId) {
          closeApproveConfirmationModal();
        }

      } catch (err) {
        console.error(`Помилка при рішенні '${decisionAction}' по заявці #${loanId}:`, err);
        const errorMessage = err.response?.data?.error || `Не вдалося обробити заявку #${loanId}.`;

        if (showApproveModal.value && decisionAction === 'approve' && selectedLoan.value && selectedLoan.value.id === loanId) {
          decisionErrorInModal.value = errorMessage;
        } else {
          uiStore.addNotification({
            message: errorMessage,
            type: 'error'
          });
        }
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          await router.push('/');
        }
      } finally {
        if (currentProcessingLoan) {
          currentProcessingLoan.isProcessing = false;
          currentProcessingLoan.currentAction = null;
        }
        isLoadingDecision.value = false;
      }
    };

    onMounted(fetchPendingLoans);

    return {
      pendingLoans,
      isLoading,
      error,
      showApproveModal,
      selectedLoan,
      decisionErrorInModal,
      isLoadingDecision,
      openApproveConfirmationModal,
      closeApproveConfirmationModal,
      processLoanDecision,
    };
  }
};
</script>

<style scoped>

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
}

.action-button {
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 11px;
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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
  padding: 15px;
}

.modal-content {
  background-color: #1e1e1e;
  color: #ffffff;
  width: 100%;
  max-width: 500px;
  padding: 25px 30px;
  border-radius: 8px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.6);
  position: relative;
  text-align: left;
}

.modal-content h3 {
  color: #42b983;
  margin-bottom: 20px;
  text-align: center;
  font-size: 20px;
}

.close-icon {
  position: absolute;
  top: 10px;
  right: 15px;
  font-size: 28px;
  color: #aaa;
  cursor: pointer;
  transition: color 0.3s ease;
  line-height: 1;
}

.close-icon:hover {
  color: #fff;
}

.loan-details-review {
  margin-bottom: 15px;
  padding: 10px;
  background-color: #2a2a2a;
  border-radius: 4px;
}

.loan-details-review p {
  margin: 5px 0;
  font-size: 0.95em;
}

.confirmation-question {
  margin: 20px 0;
  text-align: center;
  font-size: 1.05em;
  color: #e0e0e0;
}

.submit-button {
  background-color: #42b983;
  padding: 12px 20px; color: #fff;
  border: none; border-radius: 5px;
  cursor: pointer; font-size: 16px;
  font-weight: bold;
  transition: background-color 0.3s ease;
  width: 100%;
  margin-top: 10px;
}

.submit-button:disabled {
  background-color: #555;
  cursor:not-allowed;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 25px;
}
.modal-actions .submit-button {
  width: auto;
  padding: 10px 20px;
  margin-top: 0;
}
.modal-actions .confirm-action-btn {
  background-color: #28a745;
}
.modal-actions .confirm-action-btn:hover {
  background-color: #218838;
}
.modal-actions .cancel-action-btn {
  background-color: #dc3545;
}
.modal-actions .cancel-action-btn:hover {
  background-color: #c82333;
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