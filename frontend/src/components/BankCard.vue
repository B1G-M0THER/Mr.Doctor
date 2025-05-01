<template>
  <div class="card-container" @click="flipCard" :class="{ 'flipped': isFlipped }">
    <div class="card">
      <div class="card-front">
        <div class="bank-logo">YB</div>
        <div class="card-number">{{ formattedCardNumber }}</div>
        <div class="card-bottom">
          <div class="card-holder">{{ cardHolderName }}</div>
          <div class="card-expiry">{{ expiryDate }}</div>
        </div>
      </div>
      <div class="card-back">
        <div class="black-strip"></div>
        <div class="cvc-box">
          <span class="cvc">{{ cvc }}</span>
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
    cvc: {
      type: [String, Number],
      required: true,
    },
    expiryDate: {
      type: String, // Default format
    },
    balance: { // *** НОВИЙ PROP ***
      type: Number,
      default: 0 // Значення за замовчуванням
    }
  },
  data() {
    return {
      isFlipped: false
    };
  },
  computed: {
    formattedCardNumber() {
      const numStr = String(this.cardNumber);
      return numStr.replace(/\s/g, '').replace(/(\d{4})(?=\d)/g, '$1 ') || '0000 0000 0000 0000';
    },
    formattedBalance() { // *** НОВЕ COMPUTED для форматування балансу ***
      // Форматуємо число з двома знаками після коми
      return this.balance.toFixed(2) + ' UAH';
    }

  },
  methods: {
    flipCard() {
      this.isFlipped = !this.isFlipped;
    }
  }
};
</script>

<style scoped>
/* Import Google Font */
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600&display=swap');

body {
  display: flex;
  justify-content: center;
  align-items: center;
  background: #1A1A1A;
  font-family: 'Rajdhani', sans-serif;
}

/* Scoped styles from styles.css, adapted for the component */
.card-container {
  width: 360px; /* Adjust width as needed */
  height: 220px; /* Adjust height as needed */
  perspective: 1000px;
  cursor: pointer; /* Indicate it's clickable */
  margin: 20px auto; /* Center the card and add some margin */
}

.card {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s; /* Smoother transition */
}

/* Apply flip transformation when .flipped class is present */
.flipped .card {
  transform: rotateY(180deg);
}

.card-front, .card-back {
  width: 100%;
  height: 100%;
  position: absolute;
  border-radius: 15px;
  backface-visibility: hidden; /* Hide the back side when facing away */
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.5); /* Slightly enhanced shadow */
  border: 1px solid rgba(255, 255, 255, 0.2); /* Subtle border */
  overflow: hidden; /* Ensure content doesn't spill out */
  box-sizing: border-box;
}

.card-front {
  background: linear-gradient(135deg, #3a3d40, #18191c); /* Slightly adjusted gradient */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: white; /* Light grey text */
  padding: 25px;
}

/* Style for initials/logo */
.bank-logo {
  font-size: 24px;
  font-weight: bold;
  text-transform: uppercase;
  color: #42b983; /* Adjusted color */
  align-self: flex-start; /* Position logo top-left */
}

.card-number {
  font-size: 24px; /* Slightly smaller font size for better fit */
  letter-spacing: 3px; /* Increased spacing */
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-grow: 1;
  text-align: center;
  margin: 5px 0;
}

.card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-holder, .card-expiry {
  font-size: 16px; /* Adjusted size */
  text-transform: uppercase;
  font-weight: bold; /* Slightly less bold */
  opacity: 0.9;
}

.card-back {
  background: linear-gradient(135deg, #3a3d40, #18191c);
  transform: rotateY(180deg); /* Start flipped */
  display: flex;
  flex-direction: column; /* Align items vertically */
  justify-content: flex-start; /* Align items to the top */
  align-items: center;
  padding: 0; /* Remove padding to allow full-width strip */
  color: white;
  position: relative;
  font-family: 'Rajdhani', sans-serif;
}

.card-balance {
  position: absolute; /* Абсолютне позиціонування */
  bottom: 20px;      /* Відступ знизу */
  left: 25px;       /* Відступ зліва */
  color: #cfd8dc;   /* Світло-сірий колір */
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
  height: 50px; /* Increased height */
  background: #111; /* Darker strip */
  margin-top: 30px; /* Position strip down */
}

.cvc-box {
  width: calc(100% - 40px); /* Make CVC area wider */
  height: 40px;
  background: repeating-linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.1),
      rgba(255, 255, 255, 0.1) 5px,
      rgba(255, 255, 255, 0.15) 5px,
      rgba(255, 255, 255, 0.15) 10px
  ); /* Signature panel pattern */
  border-radius: 5px;
  margin-top: 20px; /* Space below strip */
  display: flex;
  justify-content: flex-end; /* Align CVC to the right */
  align-items: center;
  padding-right: 15px; /* Padding for CVC */
  margin-left: auto;
  margin-right: 20px;
}

.cvc {
  filter: blur(3px);
  transition: filter 0.3s ease;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  color: white;
  background-color: rgba(0, 0, 0, 0.5); /* Background for readability */
  padding: 2px 8px;
  border-radius: 3px;
  font-family: 'Courier New', Courier, monospace;
}
.cvc:hover {
  filter: blur(0px);
}
</style>

