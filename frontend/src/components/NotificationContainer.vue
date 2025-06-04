<template>
  <div class="notification-container">
    <transition-group name="notification-list" tag="div">
      <NotificationItem
          v-for="notification in notifications"
          :key="notification.id"
          :notification="notification"
          @close="removeNotification"
      />
    </transition-group>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useUiStore } from '../store/uiStore';
import NotificationItem from './NotificationItem.vue';

const uiStore = useUiStore();
const notifications = computed(() => uiStore.notifications);

function removeNotification(id) {
  uiStore.removeNotification(id);
}
</script>

<style scoped>
.notification-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}


.notification-list-enter-active,
.notification-list-leave-active {
  transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1);
}

.notification-list-enter-from,
.notification-list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.notification-list-move {
  transition: transform 0.5s cubic-bezier(0.55, 0, 0.1, 1);
}
</style>