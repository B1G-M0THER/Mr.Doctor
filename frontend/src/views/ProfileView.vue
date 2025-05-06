<template>
  <div class="page">
    <h1>Профіль користувача</h1>

    <div v-if="user" class="user-info">
      <p><strong>Ім'я:</strong> {{ user.name }}</p>
      <p><strong>Email:</strong> {{ user.email }}</p>
      <p><strong>Телефон:</strong> {{ user.phone_number }}</p>
    </div>
    <div v-else-if="isLoadingUser"> <p>Завантаження даних користувача...</p>
    </div>
    <div v-else>
      <p>Не вдалося завантажити дані користувача.</p> </div>

    <h2>Ваша картка</h2>
    <div v-if="isLoadingCard">
      <p>Завантаження даних картки...</p>
    </div>
    <div v-else-if="activeCard && user">
      <BankCard
          :card-number="activeCard.card_number"
          :card-holder-name="user.name"
          :cvv="activeCard.cvv" :expiry-date="activeCard.dueDate"
          :balance="activeCard.balance"
      />
      <button @click="openTransferModal" class="action-button transfer-button">
        Переказати кошти
      </button>
    </div>
    <div v-else>
      <p>У вас немає активних карток або не вдалося завантажити дані картки.</p>
    </div>

    <div v-if="showTransferModal" class="modal-overlay" @click.self="closeTransferModal">
      <div class="modal-content">
        <div class="close-icon" @click="closeTransferModal">×</div>
        <h3>Переказ коштів з картки</h3>
        <div v-if="activeCard" class="transfer-from-info">
          <p>З картки: ...{{ activeCard.card_number.slice(-4) }}</p>
          <p>Поточний баланс: {{ activeCard.balance.toFixed(2) }} UAH</p>
        </div>

        <form @submit.prevent="handleTransferSubmit">
          <div class="form-group">
            <label for="receiverCardNumber">Номер картки отримувача:</label>
            <input type="text" id="receiverCardNumber" v-model="transferData.receiverCardNumber" @input="formatReceiverCardNumber" placeholder="0000 0000 0000 0000" maxlength="19" required />
          </div>
          <div class="form-group">
            <label for="transferAmount">Сума переказу (UAH):</label>
            <input type="number" id="transferAmount" v-model.number="transferData.amount" placeholder="Наприклад, 100" step="0.01" min="1" required />
          </div>
          <div class="form-group">
            <label for="senderCVV">Ваш CVV (з картки ...{{ activeCard ? activeCard.card_number.slice(-4) : '' }}):</label>
            <input type="password" id="senderCVV" v-model.trim="transferData.senderCVV" placeholder="XXX" maxlength="3" required />
          </div>
          <div class="form-group">
            <label for="senderPIN">Ваш PIN-код картки:</label>
            <input type="password" id="senderPIN" v-model.trim="transferData.senderPIN" placeholder="XXXX" maxlength="4" required />
          </div>

          <div v-if="transferError" class="error-message">
            {{ transferError }}
          </div>
          <div v-if="transferSuccessMessage" class="success-message">
            {{ transferSuccessMessage }}
          </div>

          <div class="form-group">
            <button type="submit" class="submit-button" :disabled="transferLoading">
              {{ transferLoading ? 'Обробка...' : 'Переказати' }}
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script>
import axios from 'axios';
import BankCard from '../components/BankCard.vue';

export default {
  name: 'ProfileView',
  components: {
    BankCard
  },
  data() {
    return {
      user: null,
      activeCard: null,
      isLoadingUser: true,
      isLoadingCard: true,
      showTransferModal: false,
      transferData:{
        receiverCardNumber:'',
        amount:'',
        senderCVV:'',
        senderPIN:'',
      },
      transferError: null,
      transferSuccessMessage: null,
      transferLoading: false,
    };
  },
  async created() {
    await this.fetchUserData();
    if (this.user && !this.transferSuccessMessage) {
      await this.fetchCardData();
    }
  },
  methods: {
    async fetchUserData() {
      this.isLoadingUser = true;
      this.user = null;
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          this.$router.push('/');
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get('/api/profile', { headers });
        this.user = response.data;
      } catch (error) {
        console.error("Помилка завантаження даних користувача:", error);
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('userId');
          this.$router.push('/');
        }
      } finally {
        this.isLoadingUser = false;
      }
    },

    async fetchCardData() {
      this.isLoadingCard = true;
      this.activeCard = null;
      try {
        const token = localStorage.getItem('token');
        if (!token || !this.user) {
          this.isLoadingCard = false;
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get('/api/cards/mycard', { headers });

        if (response.data && response.data.card_number && response.data.cvv && response.data.status === 'active') {
          this.activeCard = response.data;
        } else {
          this.activeCard = null;

          if (response.data && response.data.status !== 'active') {
            console.log("Картка користувача не активна або дані неповні.");
          }
        }
      } catch (error) {
        if (error.response && error.response.status !== 404) {
          console.error("Помилка завантаження даних картки:", error);
        } else if (!error.response) {
          console.error("Помилка завантаження даних картки:", error);
        }
        this.activeCard = null;
      } finally {
        this.isLoadingCard = false;
      }
    },

    openTransferModal() {
      if (!this.activeCard) {
        alert("У вас немає активної картки для здійснення переказу.");
        return;
      }
      this.transferData = {
        receiverCardNumber: '',
        amount: null,
        senderCVV: '',
        senderPIN: ''
      };
      this.transferError = null;
      this.transferSuccessMessage = null;
      this.showTransferModal = true;
    },
    closeTransferModal() {
      this.showTransferModal = false;
    },
    formatReceiverCardNumber(event) {
      const input = event.target;
      const value = input.value;
      const selectionStart = input.selectionStart;

      let rawDigits = value.replace(/\D/g, '');

      if (rawDigits.length > 16) {
        rawDigits = rawDigits.substring(0, 16);
      }

      let formattedValue = '';
      for (let i = 0; i < rawDigits.length; i++) {
        if (i > 0 && i % 4 === 0) {
          formattedValue += ' ';
        }
        formattedValue += rawDigits[i];
      }

      this.transferData.receiverCardNumber = formattedValue;

      this.$nextTick(() => {
        let newCursorPosition = selectionStart;

        const originalCharsBeforeCursor = value.substring(0, selectionStart).replace(/\s/g, "").length;
        let tempRawCharCount = 0;
        let finalPos = 0;
        for(let i=0; i < formattedValue.length; i++) {
          if(/\d/.test(formattedValue[i])) {
            tempRawCharCount++;
          }
          finalPos++;
          if(tempRawCharCount >= originalCharsBeforeCursor && originalCharsBeforeCursor > 0) break;
          if(originalCharsBeforeCursor === 0 && i>= selectionStart) break;
        }

        if (value.length > formattedValue.length && selectionStart > formattedValue.length) {
          newCursorPosition = formattedValue.length;
        } else if (value.length < formattedValue.length && value.charAt(selectionStart - 1) !== ' ' && formattedValue.charAt(selectionStart) === ' ' && selectionStart < formattedValue.length) {
          newCursorPosition = selectionStart + 1;
        } else {
          newCursorPosition = finalPos > formattedValue.length ? formattedValue.length : finalPos;
        }

        newCursorPosition = Math.min(newCursorPosition, formattedValue.length);
        newCursorPosition = Math.max(0, newCursorPosition);

        input.setSelectionRange(newCursorPosition, newCursorPosition);
      });
    },

    async handleTransferSubmit() {
      this.transferLoading = true;
      this.transferError = null;
      this.transferSuccessMessage = null;

      const receiverCardNumberClean = this.transferData.receiverCardNumber.replace(/\s/g, '');

      if (!receiverCardNumberClean || !this.transferData.amount || !this.transferData.senderCVV || !this.transferData.senderPIN) {
        this.transferError = "Будь ласка, заповніть всі поля.";
        this.transferLoading = false;
        return;
      }

      if (receiverCardNumberClean.length !== 16) {
         this.transferError = "Номер картки отримувача повинен містити 16 цифр.";
         this.transferLoading = false;
        return;
       }

      if (this.transferData.amount <= 0) {
        this.transferError = "Сума переказу повинна бути більшою за нуль.";
        this.transferLoading = false;
        return;
      }
      if (this.activeCard && this.transferData.amount > this.activeCard.balance) {
        this.transferError = "Недостатньо коштів на вашому балансі.";
        this.transferLoading = false;
        return;
      }

      if (this.transferData.senderCVV.length !== 3) {
        this.transferError = "CVV повинен містити 3 цифри.";
        this.transferLoading = false;
        return;
      }
      if (this.transferData.senderPIN.length !== 4) {
        this.transferError = "PIN-код повинен містити 4 цифри.";
        this.transferLoading = false;
        return;
      }

      if (this.activeCard && receiverCardNumberClean === this.activeCard.card_number.replace(/\s/g, '')) {
        this.transferError = "Неможливо переказати кошти на власну картку.";
        this.transferLoading = false;
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          this.transferError = "Помилка автентифікації. Спробуйте увійти знову.";
          this.transferLoading = false;
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };

        const payload = {
          receiverCardNumber: receiverCardNumberClean,
          amount: this.transferData.amount,
          senderCVV: this.transferData.senderCVV,
          senderPIN: this.transferData.senderPIN
        };

        const response = await axios.post('/api/transactions/transfer', payload, { headers });

        this.transferSuccessMessage = response.data.message || "Переказ успішно виконано!";
        await this.fetchCardData();

        setTimeout(() => {
          this.closeTransferModal();
          this.transferSuccessMessage = null;
        }, 3000);

      } catch (error) {
        this.transferError = error.response?.data?.error || "Помилка під час переказу.";
        console.error("Помилка переказу:", error);
      } finally {
        this.transferLoading = false;
      }
    }
  }
};

</script>

<style scoped>

.page {
  text-align: center;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  font-size: 28px;
  margin-bottom: 20px;
  color: #ffffff;
}

h2 {
  font-size: 22px;
  margin-top: 30px;
  margin-bottom: 15px;
  color: #e0e0e0;
}

.user-info p {
  font-size: 16px;
  color: #cfd8dc;
  margin-bottom: 10px;
  line-height: 1.6;
}

.user-info strong {
  color: #b0bec5;
}

.action-button {
  background-color: #42b983;
  color: #ffffff;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-top: 20px;
}
.action-button:hover {
  background-color: #369966;
}
.action-button:disabled {
  background-color: #555;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
  padding: 15px;
}

.modal-content {
  background-color: #1e1e1e;
  color: #ffffff;
  width: 100%;
  max-width: 450px;
  padding: 25px 30px;
  border-radius: 8px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.6);
  position: relative;
  text-align: left;
}

.modal-content h3 {
  color: #42b983;
  margin-bottom: 20px;
  text-align: center;
  font-size: 20px;
}

.close-icon {
  position: absolute;
  top: 10px;
  right: 15px;
  font-size: 28px;
  color: #aaa;
  cursor: pointer;
  transition: color 0.3s ease;
  line-height: 1;
}

.close-icon:hover {
  color: #fff;
}

.transfer-from-info {
  margin-bottom: 20px;
  padding: 10px;
  background-color: #2a2a2a;
  border-radius: 5px;
  font-size: 14px;
}

.transfer-from-info p {
  margin: 5px 0;
  color: #ccc;
}

.form-group {
  margin-bottom: 18px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #cfd8dc;
  font-size: 14px;
  font-weight: 500;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group input[type="password"] {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #444;
  border-radius: 5px;
  background-color: #333;
  color: #fff;
  box-sizing: border-box;
  font-size: 16px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.form-group input[type="text"]:focus,
.form-group input[type="number"]:focus,
.form-group input[type="password"]:focus {
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
  outline: none;
}

.form-group input::placeholder {
  color: #777;
}

.submit-button {
  background-color: #42b983;
  padding: 12px 20px;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: background-color 0.3s ease;
  width: 100%;
  margin-top: 10px;
}
.submit-button:hover {
  background-color: #369966;
}
.submit-button:disabled {
  background-color: #555;
  cursor: not-allowed;
}

.error-message {
  color: #ff6b6b;
  background-color: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 15px;
  font-size: 14px;
  text-align: center;
}

.success-message {
  color: #42b983;
  background-color: rgba(66, 185, 131, 0.1);
  border: 1px solid rgba(66, 185, 131, 0.3);
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 15px;
  font-size: 14px;
  text-align: center;
}

</style>
