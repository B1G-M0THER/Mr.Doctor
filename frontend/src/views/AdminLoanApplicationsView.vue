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
            <button @click="openDecisionModal(loan)" class="action-button confirm" :disabled="loan.isProcessing">
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

    <div v-if="showDecisionModal && selectedLoan" class="modal-overlay" @click.self="closeDecisionModal">
      <div class="modal-content">
        <span class="close-icon" @click="closeDecisionModal">&times;</span>
        <h3>Рішення по кредиту #{{ selectedLoan.id }}</h3>
        <p><strong>Користувач:</strong> {{ selectedLoan.Users.name }} ({{selectedLoan.Users.email}})</p>
        <div class="loan-details-review">
          <p><strong>Запит:</strong> {{ selectedLoan.amount.toFixed(2) }} UAH на {{ selectedLoan.term }} міс.</p>
          <p><strong>Запропонована системою ставка:</strong> {{ selectedLoan.interest_rate.toFixed(2) }}%</p>
        </div>
        <form @submit.prevent="processLoanDecision(selectedLoan.id, 'approve', true)">
          <div class="form-group">
            <label :for="'finalRate-' + selectedLoan.id">Встановіть фінальну ставку (% річних):</label>
            <input type="number" :id="'finalRate-' + selectedLoan.id" v-model.number="decisionForm.finalInterestRate" step="0.01" min="0" required>
          </div>
          <div class="form-group">
            <label :for="'finalTerm-' + selectedLoan.id">Встановіть фінальний термін (міс.):</label>
            <input type="number" :id="'finalTerm-' + selectedLoan.id" v-model.number="decisionForm.finalTerm" step="1" min="1" required>
          </div>
          <div v-if="decisionError" class="error-message">{{ decisionError }}</div>
          <button type="submit" class="submit-button" :disabled="selectedLoan.isProcessing || isLoadingDecision">
            {{ (selectedLoan.isProcessing && selectedLoan.currentAction === 'approve') || isLoadingDecision ? 'Обробка...' : 'Схвалити та видати кредит' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

export default {
  name: 'AdminLoanApplicationsView',
  setup() {
    const router = useRouter();
    const pendingLoans = ref([]);
    const isLoading = ref(true);
    const error = ref(null);
    const showDecisionModal = ref(false);
    const selectedLoan = ref(null);
    const decisionForm = ref({
      finalInterestRate: null,
      finalTerm: null,
    });
    const decisionError = ref(null);
    const isLoadingDecision = ref(false);

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
        const response = await axios.get('/api/admin/loans/pending', { headers });
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

    const openDecisionModal = (loan) => {
      selectedLoan.value = { ...loan };
      decisionForm.value.finalInterestRate = loan.interest_rate;
      decisionForm.value.finalTerm = loan.term;
      decisionError.value = null;
      showDecisionModal.value = true;
    };

    const closeDecisionModal = () => {
      showDecisionModal.value = false;
      selectedLoan.value = null;
    };

    const processLoanDecision = async (loanId, decisionAction, fromModal = false) => {
      const loanRef = pendingLoans.value.find(l => l.id === loanId) || selectedLoan.value;
      if (loanRef) {
        loanRef.isProcessing = true;
        loanRef.currentAction = decisionAction;
      }
      if (fromModal) {
        decisionError.value = null;
        isLoadingDecision.value = true;
      } else {
        isLoadingDecision.value = true;
      }


      try {
        const token = localStorage.getItem('token');
        if (!token) {
          alert("Сесія закінчилася. Будь ласка, увійдіть знову.");
          await router.push('/');
          if (loanRef) loanRef.isProcessing = false;
          isLoadingDecision.value = false;
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };

        let payload = { decision: decisionAction };
        if (decisionAction === 'approve' && fromModal) {
          if (decisionForm.value.finalInterestRate <=0 || decisionForm.value.finalTerm <=0) {
            decisionError.value = "Ставка та термін мають бути позитивними.";
            if (loanRef) loanRef.isProcessing = false;
            isLoadingDecision.value = false;
            return;
          }
          payload.finalInterestRate = decisionForm.value.finalInterestRate;
          payload.finalTerm = decisionForm.value.finalTerm;
        }

        const response = await axios.post(`/api/admin/loans/decide/${loanId}`, payload, { headers });
        alert(response.data.message || `Рішення '${decisionAction}' по заявці #${loanId} прийнято.`);
        pendingLoans.value = pendingLoans.value.filter(l => l.id !== loanId);
        if (fromModal) closeDecisionModal();

      } catch (err) {
        console.error(`Помилка при рішенні '${decisionAction}' по заявці #${loanId}:`, err);
        const errorMessage = err.response?.data?.error || `Не вдалося обробити заявку #${loanId}.`;
        if (fromModal) {
          decisionError.value = errorMessage;
        } else {
          alert(errorMessage);
        }
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          await router.push('/');
        }
      } finally {
        if (loanRef) {
          loanRef.isProcessing = false;
          loanRef.currentAction = null;
        }
        isLoadingDecision.value = false;
      }
    };

    onMounted(fetchPendingLoans);

    return {
      pendingLoans,
      isLoading,
      error,
      showDecisionModal,
      selectedLoan,
      decisionForm,
      decisionError,
      isLoadingDecision,
      openDecisionModal,
      closeDecisionModal,
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

.requests-list table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  table-layout: fixed;
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

.form-group {
  margin-bottom: 15px;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
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
  font-size: 15px;
}

.form-group input[type="number"]:focus {
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
  outline: none;
}

.submit-button {
  background-color: #42b983;
  padding: 12px 20px;
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

.submit-button:disabled {
  background-color: #555;
  cursor: not-allowed;
}

.error-message {
  color: #ff6b6b;
  background-color: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 15px;
  font-size: 14px;
  text-align: center;
}

</style>