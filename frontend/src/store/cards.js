import { defineStore } from "pinia";
import axios from "axios";

export const useCardStore = defineStore("card", {
    state: () => ({
        cardNumber: null,
    }),
    actions: {
        async createCard(name, email, pin) {
            try {
                const response = await axios.post("/api/cards/create", { name, email, pin });
                this.cardNumber = response.data.cardNumber;
                return response.data;
            } catch (error) {
                throw error.response.data;
            }
        },
    },
});
