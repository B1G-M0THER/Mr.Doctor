<template>
  <div class="page">
    <h1>Ваш Профиль</h1>
    <p>Тут будет ваш профиль.</p>
  </div>
</template>

<script>
import axios from "axios";
export default {
  setup() {
    const logout = async () => {
      try {
        await axios.post("/api/logout", {}, { withCredentials: true });
        window.location.href = "/"; // Перенаправление на главную страницу
      } catch (error) {
        alert(error.response?.data?.message || "Ошибка при выходе");
      }
    };

    return {
      logout
    };
  },
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
