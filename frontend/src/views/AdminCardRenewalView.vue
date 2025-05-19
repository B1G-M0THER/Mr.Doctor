<template>
  <div class="admin-page">
    <h1>Запити на поновлення карток</h1>
    <div v-if="isLoading" class="loading-message">
      <p>Завантаження запитів...</p>
    </div>
    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
    </div>
    <div v-else-if="renewalRequests.length === 0" class="no-requests">
      <p>Наразі немає запитів на поновлення карток.</p>
    </div>
    <div v-else class="requests-list">
      <table>
        <thead>
        <tr>
          <th>ID Картки</th>
          <th>Номер Картки (Новий)</th>
          <th>Власник</th>
          <th>Email Власника</th>
          <th>Баланс (UAH)</th>
          <th>Новий термін дії</th>
          <th>Дія</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="request in renewalRequests" :key="request.id">
          <td>{{ request.id }}</td>
          <td>{{ request.card_number }}</td>
          <td>{{ request.holder_name }} (ID: {{ request.holder_id }})</td>
          <td>{{ request.holder_email }}</td>
          <td>{{ request.balance.toFixed(2) }}</td>
          <td>{{ request.dueDate }}</td>
          <td>
            <button
                @click="approveRenewal(request.id)"
                :disabled="request.isApproving"
                class="approve-button"
            >
              {{ request.isApproving ? 'Обробка...' : 'Підтвердити поновлення' }}
            </button>
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'AdminCardRenewalView',
  data() {
    return {
      renewalRequests: [],
      isLoading: true,
      error: null,
    };
  },
  async created() {
    await this.fetchRenewalRequests();
  },
  methods: {
    async fetchRenewalRequests() {
      this.isLoading = true;
      this.error = null;
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          this.error = "Помилка автентифікації. Будь ласка, увійдіть знову.";
          this.$router.push('/');
          this.isLoading = false;
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get('/api/admin/cards/renewal-requests', { headers });
        this.renewalRequests = response.data.map(req => ({ ...req, isApproving: false }));
      } catch (err) {
        console.error("Помилка завантаження запитів на поновлення:", err);
        this.error = err.response?.data?.error || "Не вдалося завантажити запити на поновлення.";
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          this.$router.push('/');
        }
      } finally {
        this.isLoading = false;
      }
    },
    async approveRenewal(cardId) {
      const request = this.renewalRequests.find(r => r.id === cardId);
      if (request) {
        request.isApproving = true;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          alert("Сесія закінчилася. Будь ласка, увійдіть знову.");
          this.$router.push('/');
          if (request) request.isApproving = false;
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        await axios.post(`/api/admin/cards/approve-renewal/${cardId}`, {}, { headers });

        alert(`Поновлення для картки ID ${cardId} успішно підтверджено.`);
        this.renewalRequests = this.renewalRequests.filter(r => r.id !== cardId);
        if (this.renewalRequests.length === 0 && !this.isLoading) {
          // Якщо це був останній запит, можна оновити весь список, щоб побачити актуальний стан
          // await this.fetchRenewalRequests();
        }

      } catch (err) {
        console.error(`Помилка підтвердження поновлення для картки ID ${cardId}:`, err);
        alert(err.response?.data?.error || `Не вдалося підтвердити поновлення для картки ID ${cardId}.`);
        if (request) {
          request.isApproving = false;
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
}

.error-message {
  color: #ff6b6b;
  background-color: rgba(255, 107, 107, 0.1);
  border: 1px solid #ff6b6b;
  border-radius: 5px;
}

.no-requests {
  color: #ccc;
}

.requests-list table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.requests-list th,
.requests-list td {
  border: 1px solid #444;
  padding: 10px 12px;
  text-align: left;
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

.approve-button {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 0.9em;
}

.approve-button:hover {
  background-color: #218838;
}

.approve-button:disabled {
  background-color: #555;
  cursor: not-allowed;
}
</style>