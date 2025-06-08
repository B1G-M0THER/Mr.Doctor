<template>
  <div class="card-container" @click="tryFlipCard" :class="{ 'flipped': isFlipped, 'disabled-card': isDisabled }">
    <div class="card-overlay" v-if="isExpired || isRenewalPending">
      <span class="overlay-text">{{ cardOverlayText }}</span>
    </div>
    <div class="card">
      <div class="card-front">
        <div class="bank-logo">YB</div>
        <div
            class="card-number"
            @click.stop="toggleCardMask"
            @dblclick.stop="copyCardNumber"
            :title="isCardNumberMasked ? 'Натисніть, щоб показати номер' : 'Натисніть, щоб приховати номер. Подвійний клік для копіювання.'"
        >
          {{ formattedCardNumber }}
        </div>
        <div class="card-bottom">
          <div class="card-holder">{{ cardHolderName }}</div>
          <div class="card-expiry">{{ expiryDate }} {{ status === 'expired' ? '(Термін дії вийшов)' : '' }}</div>
        </div>
        <div v-if="showCopySuccess" class="copy-success-notification">
          Скопійовано!
        </div>
      </div>
      <div class="card-back">
        <div class="black-strip"></div>
        <div class="cvv-box">
          <span
              class="cvv"
              @click.stop="toggleCvvBlur"
              :class="{ 'cvv-blurred': !isCvvRevealed }"
          >
            {{ cvv }}
          </span>
        </div>
        <div class="card-balance">
          <span>Баланс:</span> {{ formattedBalance }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BankCard',
  props: {
    cardNumber: {
      type: String,
      required: true,
    },
    cardHolderName: {
      type: String,
      required: true,
    },
    cvv: {
      type: [String, Number],
      required: true,
    },
    expiryDate: {
      type: String,
    },
    balance: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      default: 'active',
    }
  },
  data() {
    return {
      isFlipped: false,
      isCvvRevealed: false,
      isCardNumberMasked: true,
      showCopySuccess: false,
      copyTimeout: null,
    };
  },
  computed: {
    formattedCardNumber() {
      const numStr = String(this.cardNumber).replace(/\s/g, '');
      if (numStr.length < 8) {
        return numStr;
      }

      if (this.isCardNumberMasked) {
        const firstFour = numStr.substring(0, 4);
        const lastFour = numStr.substring(numStr.length - 4);
        const middleBlocksCount = Math.floor((numStr.length - 8) / 4);
        const remainingMiddleDigits = (numStr.length - 8) % 4;

        let middleMask = '';
        for (let i = 0; i < middleBlocksCount; i++) {
          middleMask += ' ****';
        }
        if (remainingMiddleDigits > 0) {
          middleMask += ' ' + '*'.repeat(remainingMiddleDigits);
        }
        return `${firstFour} **** **** ${lastFour}`;
      } else {

        return numStr.replace(/(\d{4})(?=\d)/g, '$1 ');
      }
    },

    formattedBalance() {
      return this.balance.toFixed(2) + ' UAH';
    },

    isExpired() {
      return this.status === 'expired';
    },
    isRenewalPending() {
      return this.status === 'renewal_pending';
    },
    isDisabled() {
      return this.isExpired || this.isRenewalPending;
    },
    cardOverlayText() {
      if (this.isExpired) return 'ПРОСТРОЧЕНА';
      if (this.isRenewalPending) return 'ОЧІКУЄ ПОНОВЛЕННЯ';
      return '';
    }

  },
  methods: {

    tryFlipCard() {
      if (this.isDisabled) {
        return;
      }
      this.flipCard();
    },

    flipCard() {
      if (this.isCvvRevealed) {
        this.isCvvRevealed = false;
      }
      if (!this.isCardNumberMasked) { this.isCardNumberMasked = true; }
      this.isFlipped = !this.isFlipped;
    },

    toggleCvvBlur() {
      this.isCvvRevealed = !this.isCvvRevealed;
    },

    toggleCardMask() {
      this.isCardNumberMasked = !this.isCardNumberMasked;
    },

    async copyCardNumber() {

      const fullNumber = String(this.cardNumber).replace(/\s/g, '');
      try {
        await navigator.clipboard.writeText(fullNumber);

        this.showCopySuccess = true;

        if(this.copyTimeout) clearTimeout(this.copyTimeout);

        this.copyTimeout = setTimeout(() => {
          this.showCopySuccess = false;
        }, 2000);
      } catch (err) {
        console.error('Помилка копіювання номера картки: ', err);
      }
    }
  },
  watch: {
    status(newStatus) {
      if ((newStatus === 'expired' || newStatus === 'renewal_pending') && this.isFlipped) {
        this.isFlipped = false;
      }
    }
  }

};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600&display=swap');

body {
  display: flex;
  justify-content: center;
  align-items: center;
  background: #1A1A1A;
  font-family: 'Rajdhani', sans-serif;
}

.card-container {
  width: 360px;
  height: 220px;
  perspective: 1000px;
  cursor: pointer;
  margin: 20px auto;
  position: relative;
}

.card-container.disabled-card {
  cursor: not-allowed;
}

.card {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s;
}

.flipped .card {
  transform: rotateY(180deg);
}

.card-front, .card-back {
  width: 100%;
  height: 100%;
  position: absolute;
  border-radius: 15px;
  backface-visibility: hidden;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  box-sizing: border-box;
}

.card-front {
  background: linear-gradient(135deg, #3a3d40, #18191c);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: white;
  padding: 25px;
}

.bank-logo {
  font-size: 24px;
  font-weight: bold;
  text-transform: uppercase;
  color: #42b983;
  align-self: flex-start;
}

.card-number {
  font-size: 24px;
  letter-spacing: 3px;
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-grow: 1;
  text-align: center;
  margin: 5px 0;
  user-select: none;
  cursor: pointer;
}

.copy-success-notification {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(27, 27, 27, 0.7);
  color: #ffffff;
  padding: 5px 12px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: bold;
  z-index: 10;
  animation: fadeInOut 2s forwards ease-in-out;
}

@keyframes fadeInOut {
  0% { opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { opacity: 0; }
}

.card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-holder, .card-expiry {
  font-size: 16px;
  text-transform: uppercase;
  font-weight: bold;
  opacity: 0.9;
}

.card-back {
  background: linear-gradient(135deg, #3a3d40, #18191c);
  transform: rotateY(180deg);
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  padding: 0;
  color: white;
  position: relative;
  font-family: 'Rajdhani', sans-serif;
}

.card-balance {
  position: absolute;
  bottom: 20px;
  left: 25px;
  color: #cfd8dc;
  font-size: 14px;
  font-weight: bold;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.6);
}

.card-balance span {
  opacity: 0.8;
  margin-right: 5px;
}

.black-strip {
  width: 100%;
  height: 50px;
  background: #111;
  margin-top: 30px;
}

.cvv-box {
  width: calc(100% - 40px);
  height: 40px;
  background: repeating-linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.1),
      rgba(255, 255, 255, 0.1) 5px,
      rgba(255, 255, 255, 0.15) 5px,
      rgba(255, 255, 255, 0.15) 10px
  );
  border-radius: 5px;
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-right: 15px;
  margin-left: auto;
  margin-right: 20px;
  position: relative;
  z-index: 2;
}

.cvv {
  filter: blur(0px);
  transition: filter 0.3s ease;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  color: white;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 2px 8px;
  border-radius: 3px;
  font-family: 'Courier New', Courier, monospace;
  user-select: none;
}

.cvv.cvv-blurred {
  filter: blur(3px);
}

.card-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 15px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 5;
  pointer-events: all;
  text-decoration: line-through;
  text-decoration-color: rgba(255, 82, 82, 0.7);
  text-decoration-thickness: 3px;
}

.overlay-text {
  color: #ff5252;
  font-size: 24px;
  font-weight: bold;
  padding: 10px 20px;
  background-color: rgba(26, 26, 26, 0.8);
  border-radius: 8px;
  text-align: center;
  text-decoration: none;
  border: 1px solid #ff5252;
}
</style>

