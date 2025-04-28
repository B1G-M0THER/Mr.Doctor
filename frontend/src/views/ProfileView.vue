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
      />
    </div>
    <div v-else>
      <p>У вас немає активних карток.</p>
    </div>

  </div>
</template>

<script>
import axios from 'axios';
// Import the BankCard component
import BankCard from '../components/BankCard.vue'; // Adjust the path if necessary

export default {
  name: 'ProfileView',
  components: {
    BankCard // Register the component
  },
  data() {
    return {
      user: null, // To store user data
      activeCard: null, // To store active card data
      isLoadingUser: true,
      isLoadingCard: true,
    };
  },
  async created() {
    // Fetch user data and card data when the component is created
    await this.fetchUserData();
    // Only fetch card data if user data was loaded successfully
    if (this.user) {
      await this.fetchCardData();
    }
  },
  methods: {
    // Method to fetch user profile data
    async fetchUserData() {
      this.isLoadingUser = true;
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          // Handle case where user is not logged in, maybe redirect
          this.$router.push('/login'); // Example redirect
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        // --- Replace with your actual user profile API endpoint ---
        const response = await axios.get('/api/profile', { headers });
        this.user = response.data;
      } catch (error) {
        console.error("Помилка завантаження даних користувача:", error);
        // Handle error appropriately (e.g., show message, logout user)
        // alert('Не вдалося завантажити профіль.');
      } finally {
        this.isLoadingUser = false;
      }
    },

    // Method to fetch user's active card data
    async fetchCardData() {
      this.isLoadingCard = true;
      try {
        const token = localStorage.getItem('token');
        // No need to check token again if fetchUserData succeeded, but good practice
        if (!token) return;

        const headers = { Authorization: `Bearer ${token}` };
        // --- IMPORTANT: Replace with your ACTUAL API endpoint ---
        // This endpoint should return the user's card if it exists and is active
        // It should join Cards and Users tables to get the name or fetch user separately
        const response = await axios.get('/api/cards/mycard', { headers }); // <<< --- YOUR API ENDPOINT HERE

        // Check if the response contains card data and if it's active
        if (response.data && response.data.status === 'active') {
          // Ensure necessary fields are present
          if (response.data.card_number && response.data.cvc) {
            this.activeCard = response.data;
          } else {
            console.warn("Отримані дані картки неповні:", response.data);
            this.activeCard = null; // Set to null if data is incomplete
          }
        } else {
          this.activeCard = null; // Set to null if no active card found
        }
      } catch (error) {
        // It's common for this request to fail if the user has no card (e.g., 404 Not Found)
        // Only log error if it's not a 404 or expected "no card" scenario
        if (error.response && error.response.status !== 404) {
          console.error("Помилка завантаження даних картки:", error);
          // alert('Не вдалося завантажити дані картки.');
        } else if (!error.response) {
          // Network or other errors
          console.error("Помилка завантаження даних картки:", error);
        }
        this.activeCard = null; // Ensure activeCard is null on error
      } finally {
        this.isLoadingCard = false;
      }
    },
    // Optional: Method to navigate to the open card page
    // goToOpenCard() {
    //   this.$router.push('/open-card'); // Adjust route as needed
    // }
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
