<template>
  <div class="admin-page"> <h1>Підтвердження нових карток</h1>

    <div class="search-bar-container">
      <input
          type="text"
          v-model="searchTerm"
          placeholder="Пошук за іменем або email власника..."
          class="search-input"
      />
    </div>

    <div v-if="isLoading" class="loading-message">
      <p>Завантаження карток...</p>
    </div>
    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
    </div>
    <div v-else-if="filteredCardsToApprove.length === 0" class="no-requests">
      <p>Наразі немає нових карток для підтвердження.</p>
    </div>
    <div v-else class="requests-list">
      <table>
        <thead>
        <tr>
          <th>ID Картки</th>
          <th>Номер Картки</th>
          <th>Власник</th>
          <th>Email Власника</th>
          <th>Статус</th>
          <th>Дата створення (placeholder dueDate)</th>
          <th>Дії</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="card in filteredCardsToApprove" :key="card.id">
          <td>{{ card.id }}</td>
          <td>{{ card.card_number }}</td>
          <td>{{ card.holder_name }} (ID: {{ card.holder_id }})</td>
          <td>{{ card.holder_email }}</td>
          <td><span :class="`status-${card.status}`">{{ card.status }}</span></td>
          <td>{{ card.dueDate }}</td>
          <td class="actions-cell">
            <button
                @click="processCardAction(card.id, 'confirm')"
                :disabled="card.isProcessing"
                class="action-button confirm"
            >
              {{ card.isProcessing && card.currentAction === 'confirm' ? 'Обробка...' : 'Підтвердити' }}
            </button>
            <button
                @click="processCardAction(card.id, 'reject')"
                :disabled="card.isProcessing"
                class="action-button reject"
            >
              {{ card.isProcessing && card.currentAction === 'reject' ? 'Обробка...' : 'Відхилити' }}
            </button>
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import api from '../api.js';
import {useUiStore} from "../store/uiStore.js";
export default {
  name: "AdminCardApproval",
  data() {
    return {
      cardsToApprove: [],
      isLoading: true,
      error: null,
      searchTerm: '',
    };
  },
  computed: {
    filteredCardsToApprove() {
      if (!this.searchTerm) {
        return this.cardsToApprove;
      }
      const lowerCaseSearchTerm = this.searchTerm.toLowerCase();
      return this.cardsToApprove.filter(request => {
        const holderName = request.holder_name.toLowerCase();
        const holderEmail = request.holder_email.toLowerCase();
        return holderName.includes(lowerCaseSearchTerm) || holderEmail.includes(lowerCaseSearchTerm);
      });
    }
  },
  async created() {
    await this.fetchPendingCards();
  },
  methods: {
    async fetchPendingCards() {
      this.isLoading = true;
      this.error = null;
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          this.error = "Помилка автентифікації. Будь ласка, увійдіть знову.";
          this.$router.push('/');
          this.isLoading = false;
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        const response = await api.get("/api/admin/cards", { headers });
        this.cardsToApprove = response.data.map(card => ({
          ...card,
          isProcessing: false,
          currentAction: null
        }));
      } catch (err) {
        console.error("Помилка завантаження карток на підтвердження:", err);
        this.error = err.response?.data?.error || "Не вдалося завантажити картки.";
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          this.$router.push('/');
        }
      } finally {
        this.isLoading = false;
      }
    },
    async processCardAction(card_id, actionType) {
      const uiStore = useUiStore();
      const card = this.cardsToApprove.find(c => c.id === card_id);
      if (card) {
        card.isProcessing = true;
        card.currentAction = actionType;
      }

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          uiStore.addNotification({
            message: "Сесія закінчилася. Будь ласка, увійдіть знову.",
            type: 'error'
          });
          this.$router.push('/');
          if (card) card.isProcessing = false;
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        const response = await api.post("/api/admin/cards/confirm", { card_id, action: actionType }, { headers });

        uiStore.addNotification({
          message: response.data.message || `Дію '${actionType}' для картки ID ${card_id} виконано успішно.`,
          type: 'success'
        });
        this.cardsToApprove = this.cardsToApprove.filter(c => c.id !== card_id);
        if (this.cardsToApprove.length === 0 && !this.isLoading) {
        }

      } catch (err) {
        console.error(`Помилка при дії '${actionType}' для картки ID ${card_id}:`, err);
        uiStore.addNotification({
          message: err.response?.data?.error || `Дію '${actionType}' для картки ID ${card_id} не вдалося виконати.`,
          type: 'error'
        });
        if (card) {
          card.isProcessing = false;
          card.currentAction = null;
        }
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          this.$router.push('/');
        }
      }
    },
  },
};
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
  max-width: 1000px;
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
}

.requests-list th,
.requests-list td {
  border: 1px solid #444;
  padding: 10px 12px;
  text-align: center;
  font-size: 0.95em;
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
  gap: 10px;
}

.action-button {
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 0.9em;
  min-width: 100px;
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

.status-waiting {
  color: #f0ad4e;
  font-weight: bold;
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