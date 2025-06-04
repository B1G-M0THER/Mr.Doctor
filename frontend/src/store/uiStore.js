import { defineStore } from 'pinia';
import { ref } from 'vue';

let nextId = 0;

export const useUiStore = defineStore('ui', () => {
    const notifications = ref([]);

    function addNotification({ message, type = 'info', duration = 5000 }) {
        const id = nextId++;
        notifications.value.push({ id, message, type, duration });

        if (duration !== null) {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }
    }

    function removeNotification(id) {
        notifications.value = notifications.value.filter(n => n.id !== id);
    }

    return {
        notifications,
        addNotification,
        removeNotification
    };
});