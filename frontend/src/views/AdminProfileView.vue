<template>
  <div class="admin-dashboard">
    <h1>Адміністративна панель</h1>
    <p>Ласкаво просимо, {{ user.name }}!</p>
    <div class="actions">
      <button @click="manageUsers">Керування користувачами </button>
      <router-link to="/admin/cards">Картки для підтвердження</router-link>
      <button @click="viewStats">Переглянути статистику</button>
    </div>
  </div>
</template>

<script>
import axios from "axios";

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
        const headers = { Authorization: `Bearer ${token}` };

        const response = await axios.get("http://localhost:4000/auth/profile", { headers });

        if (response.data.role === "ADMIN") {
          this.user = response.data;
        } else {
          this.$router.push("/profile");
        }
      } catch (error) {
        this.$router.push("/");
        console.error("Error in checkUserRole:", error); // Логування помилки в консоль
        alert("Помилка при перевірці ролі: " + (error.response?.data?.error || error.message || "Невідома помилка"));
      }
    },
    manageUsers() {
      this.$router.push("/admin/manage-users");
    },
    viewStats() {
      this.$router.push("/admin/stats");
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
</style>
