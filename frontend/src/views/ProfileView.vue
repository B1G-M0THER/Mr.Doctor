<template>
  <div class="page">
    <h1>Профіль користувача</h1>

    <div v-if="user" class="user-info">
      <p><strong>Ім'я:</strong> {{ user.name }}</p>
      <p><strong>Email:</strong> {{ user.email }}</p>
      <p><strong>Телефон:</strong> {{ user.phone_number }}</p>
    </div>
    <div v-else>
      <p>Завантаження даних користувача...</p>
    </div>

    <h2>Ваша картка</h2>
    <div v-if="isLoadingCard">
      <p>Завантаження даних картки...</p>
    </div>
    <div v-else-if="activeCard && user">
      <BankCard
          :card-number="activeCard.card_number"
          :card-holder-name="user.name"
          :cvc="activeCard.cvc"
          :expiry-date="activeCard.dueDate"
          :balance="activeCard.balance"
      />
    </div>
    <div v-else>
      <p>У вас немає активних карток.</p>
    </div>

  </div>
</template>

<script>
import axios from 'axios';
import BankCard from '../components/BankCard.vue';

export default {
  name: 'ProfileView',
  components: {
    BankCard
  },
  data() {
    return {
      user: null,
      activeCard: null,
      isLoadingUser: true,
      isLoadingCard: true,
    };
  },
  async created() {
    await this.fetchUserData();
    if (this.user) {
      await this.fetchCardData();
    }
  },
  methods: {
    async fetchUserData() {
      this.isLoadingUser = true;
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          this.$router.push('/login');
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get('/api/profile', { headers });
        this.user = response.data;

      } catch (error) {
        console.error("Помилка завантаження даних користувача:", error);

      } finally {
        this.isLoadingUser = false;
      }
    },

    async fetchCardData() {
      this.isLoadingCard = true;
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get('/api/cards/mycard', { headers });

        if (response.data && response.data.status === 'active') {
          if (response.data.card_number && response.data.cvc) {
            this.activeCard = response.data;
          } else {
            console.warn("Отримані дані картки неповні:", response.data);
            this.activeCard = null;
          }
        } else {
          this.activeCard = null;
        }
      } catch (error) {
        if (error.response && error.response.status !== 404) {
          console.error("Помилка завантаження даних картки:", error);
        } else if (!error.response) {
          console.error("Помилка завантаження даних картки:", error);
        }
        this.activeCard = null;
      } finally {
        this.isLoadingCard = false;
      }
    },
  }
};
</script>

<style scoped>
.page {
  text-align: center;
  padding: 50px;
}

h1 {
  font-size: 36px;
  margin-bottom: 15px;
  color: #ffffff;
}

p {
  font-size: 18px;
  color: #cfd8dc;
  margin-bottom: 20px;
}

</style>
