<template>
  <div class="page home-view-content">
    <header class="hero-section">
      <h1>Ласкаво просимо до YB Bank! 🏦</h1>
      <p class="subtitle">Сучасний банк для ваших фінансових успіхів та впевненого майбутнього.</p>
    </header>

    <section class="about-us">
      <h2>Про YB Bank 💡</h2>
      <p>
        YB Bank – це ваш надійний та інноваційний партнер у світі фінансів. Ми прагнемо надавати
        зручні, безпечні та технологічні банківські послуги, що відповідають динамічним потребам
        сучасної людини. Наша місія – зробити управління вашими коштами максимально простим,
        прозорим та ефективним, допомагаючи вам досягати фінансових цілей.
      </p>
    </section>

    <section class="our-history">
      <h2>Наша Історія 🚀</h2>
      <p>
        Заснований на принципах клієнтоорієнтованості та цифрових інновацій, YB Bank швидко
        зарекомендував себе як символ нового покоління банківських послуг в Україні. Ми щодня
        працюємо над тим, щоб пропонувати вам лише найкраще з фінансового світу, поєднуючи
        безпеку традиційного банкінгу з гнучкістю сучасних технологій.
      </p>
    </section>

    <section class="why-choose-us">
      <h2>Чому обирають YB Bank? ✨</h2>
      <ul class="benefits-list">
        <li>
          <span class="emoji-bullet">💳</span>
          <div>
            <strong>Сучасні Картки:</strong> <router-link to="/open-card">Відкрийте</router-link> зручні платіжні картки з вигідними умовами, кешбеком та легким керуванням онлайн.
          </div>
        </li>
        <li>
          <span class="emoji-bullet">💰</span>
          <div>
            <strong>Вигідні Кредити:</strong> Потрібні кошти на мрію чи важливу покупку? <router-link to="/credit">Ознайомтеся</router-link> з нашими прозорими кредитними програмами.
          </div>
        </li>
        <li>
          <span class="emoji-bullet">🔒</span>
          <div>
            <strong>Надійні Депозити:</strong> <router-link to="/deposit">Примножуйте</router-link> ваші заощадження з конкурентними відсотковими ставками та гнучкими умовами.
          </div>
        </li>
        <li>
          <span class="emoji-bullet">💬</span>
          <div>
            <strong>Цілодобова Підтримка:</strong> Наша дружня команда підтримки завжди готова відповісти на ваші запитання через зручний онлайн-чат у вашому профілі.
          </div>
        </li>
        <li>
          <span class="emoji-bullet">📱</span>
          <div>
            <strong>Зручний Онлайн-банкінг:</strong> Керуйте своїми фінансами будь-де та будь-коли через наш інтуїтивно зрозумілий веб-інтерфейс.
          </div>
        </li>
      </ul>
    </section>

    <section class="call-to-action">
      <h2>Готові розпочати?</h2>
      <p>
        Приєднуйтесь до YB Bank сьогодні та відкрийте для себе світ сучасних та зручних фінансових можливостей!
      </p>
    </section>
  </div>
</template>

<script>
export default {
  name: "HomeView",
};
</script>

<style scoped>
.page.home-view-content {
  text-align: center;
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
  color: #cfd8dc;
}

.hero-section {
  background-size: cover;
  padding: 60px 20px;
  border-radius: 8px;
  margin-bottom: 40px;
  color: #ffffff;
}

.hero-section h1 {
  font-size: 2.5em;
  margin-bottom: 15px;
  color: #ffffff;
  font-weight: 600;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.5);
}

.hero-section .subtitle {
  font-size: 1.1em;
  color: #e0e0e0;
  max-width: 600px;
  margin: 0 auto 20px auto;
  line-height: 1.6;
}

h2 {
  font-size: 2em;
  margin-bottom: 20px;
  margin-top: 40px;
  color: #42b983;
  border-bottom: 1px solid #3a3a3a;
  padding-bottom: 10px;
}

section p, section ul {
  font-size: 1em;
  line-height: 1.7;
  text-align: left;
  margin-bottom: 20px;
}
section p {
  padding: 0 10px;
}


.benefits-list {
  list-style: none;
  padding: 0;
  text-align: left;
}

.benefits-list li {
  display: flex;
  align-items: flex-start;
  margin-bottom: 15px;
  font-size: 1em;
}

.emoji-bullet {
  font-size: 1.5em;
  margin-right: 15px;
  line-height: 1.4;
}

.benefits-list li div {
  flex: 1;
}

.benefits-list a {
  color: #42b983;
  text-decoration: none;
  font-weight: 600;
}
.benefits-list a:hover {
  text-decoration: underline;
}

.call-to-action {
  margin-top: 40px;
  padding: 30px 20px;
  background-color: rgba(55, 55, 55, 0.3);
  border-radius: 8px;
  text-align: center;
}
.call-to-action p {
  text-align: center;
}

.call-to-action .cta-link {
  color: #5cb85c;
  font-weight: bold;
  cursor: pointer;
  text-decoration: underline;
}
.call-to-action .cta-link:hover {
  color: #4cae4c;
}

@media (min-width: 769px) {
  .page.home-view-content {
    padding: 40px 50px;
  }
  .hero-section h1 {
    font-size: 3em;
  }
  .hero-section .subtitle {
    font-size: 1.3em;
  }
  h2 {
    font-size: 2.2em;
  }
  section p, .benefits-list li {
    font-size: 1.1em;
  }
}

@media (max-width: 768px) {
  .page.home-view-content {
    padding: 20px 15px;
  }
  .hero-section {
    padding: 40px 15px;
    margin-bottom: 30px;
  }
  .hero-section h1 {
    font-size: 2em;
  }
  .hero-section .subtitle {
    font-size: 1em;
  }
  h2 {
    font-size: 1.8em;
    margin-top: 30px;
  }
  section p, .benefits-list li {
    font-size: 0.95em;
    padding: 0 5px;
  }
  .emoji-bullet {
    font-size: 1.3em;
    margin-right: 10px;
  }
}

@media (max-width: 480px) {
  .hero-section {
    padding: 30px 10px;
  }
  .hero-section h1 {
    font-size: 1.8em;
  }
  .hero-section .subtitle {
    font-size: 0.9em;
  }
  h2 {
    font-size: 1.6em;
    margin-top: 25px;
    margin-bottom: 15px;
  }
  section p, .benefits-list li {
    font-size: 0.9em;
  }
  .call-to-action {
    padding: 20px 15px;
  }
}

</style>