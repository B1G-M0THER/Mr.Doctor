import { defineStore } from 'pinia';
import api from '../api.js';
import { ref } from 'vue';

export const useDepositStore = defineStore('deposit', () => {
    const userDeposits = ref([]);
    const isLoading = ref(false);
    const error = ref(null);
    const applicationMessage = ref(null);
    const withdrawalMessage = ref(null);

    async function applyForDeposit(depositData) {
        isLoading.value = true;
        error.value = null;
        applicationMessage.value = null;
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                new Error("Користувач не авторизований.");
            }
            const headers = { Authorization: `Bearer ${token}` };
            const response = await api.post('/api/deposits/apply', depositData, { headers });
            applicationMessage.value = response.data.message || "Заявку на депозит успішно подано.";

            return true;
        } catch (err) {
            error.value = err.response?.data?.error || err.message || "Помилка при поданні заявки на депозит.";
            applicationMessage.value = null;
            console.error("Error in applyForDeposit:", error.value);
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchUserDeposits() {
        isLoading.value = true;
        error.value = null;
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                userDeposits.value = [];
                isLoading.value = false;
                return;
            }
            const headers = { Authorization: `Bearer ${token}` };
            const response = await api.get('/api/deposits/my', { headers });
            userDeposits.value = response.data;
        } catch (err) {
            error.value = err.response?.data?.error || "Не вдалося завантажити ваші депозити.";
            userDeposits.value = [];
            console.error("Error in fetchUserDeposits:", error.value);
        } finally {
            isLoading.value = false;
        }
    }

    async function requestEarlyWithdrawal(depositId) {
        isLoading.value = true;
        error.value = null;
        withdrawalMessage.value = null;
        try {
            const token = localStorage.getItem('token');
            if (!token) new Error("Користувач не авторизований.");
            const headers = { Authorization: `Bearer ${token}` };
            const response = await api.post(`/api/deposits/${depositId}/withdraw-early`, {}, { headers });
            withdrawalMessage.value = response.data.message;
            await fetchUserDeposits();
            return { success: true, data: response.data };
        } catch (err) {
            error.value = err.response?.data?.error || "Помилка дострокового розірвання.";
            console.error("Error in requestEarlyWithdrawal:", error.value);
            withdrawalMessage.value = null;
            return { success: false, error: error.value };
        } finally {
            isLoading.value = false;
        }
    }

    async function withdrawMaturedDeposit(depositId) {
        isLoading.value = true;
        error.value = null;
        withdrawalMessage.value = null;
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error("Користувач не авторизований.");
            const headers = { Authorization: `Bearer ${token}` };
            const response = await api.post(`/api/deposits/${depositId}/withdraw-matured`, {}, { headers });
            withdrawalMessage.value = response.data.message;
            await fetchUserDeposits();
            return { success: true, data: response.data };
        } catch (err) {
            error.value = err.response?.data?.error || "Помилка отримання коштів по депозиту.";
            console.error("Error in withdrawMaturedDeposit:", error.value);
            withdrawalMessage.value = null;
            return { success: false, error: error.value };
        } finally {
            isLoading.value = false;
        }
    }

    return {
        userDeposits,
        isLoading,
        error,
        applicationMessage,
        withdrawalMessage,
        applyForDeposit,
        fetchUserDeposits,
        requestEarlyWithdrawal,
        withdrawMaturedDeposit,
    };
});