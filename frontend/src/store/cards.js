import { defineStore } from "pinia";
import api from '../api.js';

export const useCardStore = defineStore("card", {
    state: () => ({
        cardNumber: null,
    }),
    actions: {
        async createCard(name, email, pin) {
            try {
                const response = await api.post("/api/cards/create", { name, email, pin });
                this.cardNumber = response.data.cardNumber;
                return response.data;
            } catch (error) {
                throw error.response.data;
            }
        },
    },
});
