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
  color: #e0e0e0;
  padding: 12px 18px;
  margin-bottom: 10px;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease-out;
  cursor: default;
  min-width: 300px;
  max-width: 420px;
  word-wrap: break-word;
  border-left-width: 5px;
  border-left-style: solid;
  background-color: #2c332f;
}

.notification-item:hover {
  opacity: 0.95;
  box-shadow: 0 5px 12px rgba(0, 0, 0, 0.4);
}

.notification-item.info {
  background-color: #2a3b4d;
  border-left-color: #5c9aff;
  color: #e0f0ff;
}

.notification-item.success {
  background-color: #1e4620;
  border-left-color: #42b983;
  color: #d9f7e6;
}

.notification-item.warning {
  background-color: #4d3800;
  border-left-color: #f0ad4e;
  color: #fff3cd;
}

.notification-item.error {
  background-color: #5c1f1f;
  border-left-color: #ff6b6b;
  color: #fde0e0;
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
  color: rgba(255, 255, 255, 0.5);
  font-size: 22px;
  font-weight: bold;
  cursor: pointer;
  padding: 0 0 0 10px;
  line-height: 1;
  align-self: flex-start;
}
.close-button:hover {
  color: rgba(255, 255, 255, 0.8);
}
</style>