<template>
  <div class="admin-dashboard">
    <h1>Адміністративна панель</h1>
    <p>Ласкаво просимо, {{ user.name }}!</p>
    <div class="actions">
      <router-link to="/admin/cards" class="action-link">Картки для підтвердження (Нові)</router-link>
      <router-link to="/admin/card-renewal-requests" class="action-link">Запити на поновлення карток</router-link>
      <router-link to="/admin/loan-applications" class="action-link">Заявки на Кредит</router-link>
      <router-link to="/admin/chat" class="action-link">Підтримка (Чати)</router-link>
      <router-link to="/admin/deposit-applications" class="action-link">Заявки на Депозит</router-link>
    </div>
  </div>
</template>

<script>
import api from '../api.js';

export default {
  name: "AdminProfileView",
  data() {
    return {
      user: {},
    };
  },
  created() {
    this.checkUserRole();
  },
  methods: {
    async checkUserRole() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          this.$router.push("/");
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        const response = await api.get("/api/profile", { headers });

        if (response.data.role === "ADMIN") {
          this.user = response.data;
        } else {
          this.$router.push("/profile");
        }
      } catch (error) {
        localStorage.removeItem('token');
        this.$router.push("/");
        console.error("Error in checkUserRole (AdminProfileView):", error);
      }
    },
  },
};
</script>

<style scoped>
.admin-dashboard {
  text-align: center;
  padding: 20px;
}

.actions button {
  margin: 10px;
  padding: 10px 20px;
  background: #42b983;
  color: white;
  border: none;
  cursor: pointer;
}
.actions {
  margin-top: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}
.action-link {
  display: inline-block;
  padding: 10px 20px;
  background: #42b983;
  color: white;
  border: none;
  cursor: pointer;
  text-decoration: none;
  border-radius: 5px;
  transition: background-color 0.3s ease;
  min-width: 200px;
  text-align: center;
}
.action-link:hover {
  background-color: #369966;
}
</style>
