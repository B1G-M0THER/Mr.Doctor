<template>
  <div class="admin-dashboard">
    <h1>Адміністративна панель</h1>
    <p>Ласкаво просимо, {{ user.name }}!</p>
    <div class="actions">
      <router-link to="/admin/cards">Картки для підтвердження</router-link>
      <router-link to="/admin/chat" class="action-link">Підтримка (Чати)</router-link>
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

        const response = await axios.get("http://localhost:4000/api/profile", { headers });

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
  flex-direction: column; /* Розташувати посилання одне під одним */
  align-items: center; /* Центрувати посилання */
  gap: 15px; /* Відстань між посиланнями */
}
.action-link { /* Стилізація для посилань, щоб вони виглядали як кнопки */
  display: inline-block;
  padding: 10px 20px;
  background: #42b983;
  color: white;
  border: none;
  cursor: pointer;
  text-decoration: none;
  border-radius: 5px;
  transition: background-color 0.3s ease;
  min-width: 200px; /* Мінімальна ширина для однакового вигляду */
  text-align: center;
}
.action-link:hover {
  background-color: #369966;
}
</style>
