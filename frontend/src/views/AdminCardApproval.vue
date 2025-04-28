<template>
  <div class="admin-approval">
    <h1>Список карток, які очікують підтвердження</h1>
    <ul>
      <li v-for="card in cards" :key="card.id" class="card-item">
        <p><strong>Номер картки:</strong> {{ card.card_number }}</p>
        <p><strong>Статус:</strong> {{ card.status }}</p>
        <p><strong>Власник:</strong> {{ card.holder_name }}</p>
        <div class="actions">
          <button @click="confirmCard(card.id)">Підтвердити</button>
          <button @click="rejectCard(card.id)">Відхилити</button>
        </div>
      </li>
    </ul>
    <p v-if="!cards.length">Немає карток для підтвердження.</p>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      cards: [],
    };
  },
  async created() {
    this.fetchCards();
  },
  methods: {
    async fetchCards() {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const response = await axios.get("/api/admin/cards", { headers });
        this.cards = response.data;
      } catch (error) {
        alert("Помилка завантаження карток: " + (error.response?.data?.error || error.message));
      }
    },
    async confirmCard(card_id) {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        await axios.post("/api/admin/cards/confirm", { card_id, action: "confirm" }, { headers });

        alert("Картка підтверджена!");
        this.fetchCards(); // Оновлення списку після підтвердження
      } catch (error) {
        alert("Помилка підтвердження картки: " + (error.response?.data?.error || error.message));
      }
    },
    async rejectCard(card_id) {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        await axios.post("/api/admin/cards/confirm", { card_id, action: "reject" }, { headers });

        this.fetchCards(); // Оновлення списку після відхилення
      } catch (error) {
        alert("Помилка відхилення картки: " + (error.response?.data?.error || error.message));
      }
    },
  },
};
</script>

<style scoped>
/* Стилі для відображення карток */
.card-item {
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 5px;
  background: rgb(44, 44, 44, 0.5);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}
.actions button {
  margin-right: 10px;
  background: #26b983;
  color: #ffffff;
  border: none;
  padding: 12px;
  font-size: 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.actions button:hover {
  background-color: #369966;
}
</style>
