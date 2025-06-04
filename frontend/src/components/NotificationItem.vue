<template>
  <div :class="['notification-item', notification.type]" @click="closeNotification">
    <span class="message">{{ notification.message }}</span>
    <button class="close-button" @click.stop="closeNotification">&times;</button>
  </div>
</template>

<script setup>

const props = defineProps({
  notification: {
    type: Object,
    required: true,
  }
});

const emit = defineEmits(['close']);

function closeNotification() {
  emit('close', props.notification.id);
}

</script>

<style scoped>
.notification-item {
  color: #e0e0e0; /* Світло-сірий текст для кращої читабельності на темних фонах */
  padding: 12px 18px;
  margin-bottom: 10px; /* Залишаємо, якщо контейнер не використовує gap */
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3); /* Трохи м'якша тінь */
  transition: all 0.3s ease-out;
  cursor: default;
  min-width: 300px;
  max-width: 420px;
  word-wrap: break-word;
  border-left-width: 5px;
  border-left-style: solid;
  background-color: #2c332f; /* Базовий темний фон, трохи зеленуватий */
}

.notification-item:hover {
  opacity: 0.95;
  box-shadow: 0 5px 12px rgba(0, 0, 0, 0.4);
}

/* Інформаційне сповіщення */
.notification-item.info {
  background-color: #2a3b4d; /* Глибокий синьо-сірий */
  border-left-color: #5c9aff; /* Яскравий, але не надто, синій акцент */
  color: #e0f0ff;
}

/* Сповіщення про успіх */
.notification-item.success {
  background-color: #1e4620; /* Темно-насичений зелений фон */
  border-left-color: #42b983; /* Ваш фірмовий зелений для акценту */
  color: #d9f7e6; /* Світло-зелений текст */
}

/* Попереджувальне сповіщення */
.notification-item.warning {
  background-color: #4d3800; /* Темно-жовтий/гірчичний фон */
  border-left-color: #f0ad4e; /* Класичний жовтий для попереджень */
  color: #fff3cd; /* Світло-жовтий текст */
}

/* Сповіщення про помилку */
.notification-item.error {
  background-color: #5c1f1f; /* Темно-червоний фон */
  border-left-color: #ff6b6b; /* Яскраво-червоний акцент */
  color: #fde0e0; /* Світло-червоний текст */
}

.message {
  flex-grow: 1;
  margin-right: 15px;
  font-size: 0.95em;
  line-height: 1.4;
}

.close-button {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5); /* Менш помітний хрестик */
  font-size: 22px;
  font-weight: bold;
  cursor: pointer;
  padding: 0 0 0 10px; /* Відступ зліва від тексту */
  line-height: 1;
  align-self: flex-start; /* Вирівнювання по верху, якщо текст багаторядковий */
}
.close-button:hover {
  color: rgba(255, 255, 255, 0.8);
}
</style>