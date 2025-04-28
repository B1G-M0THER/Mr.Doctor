<template>
  <div id="app" class="vue-theme">
    <!-- Глобальный хедер -->
    <Header />

    <!-- Светлячки на фоне -->
    <div class="content-area">
      <div class="fireflies">
        <div
            class="firefly"
            v-for="n in 200"
            :key="n"
            :style="generateFireflyStyle()"
        ></div>
      </div>

      <!-- Основной контент -->
      <router-view />
    </div>
  </div>
</template>

<script>
import Header from "./components/Header.vue";

export default {
  name: "App",
  components: {
    Header,
  },
  methods: {
    generateFireflyStyle() {
      // Рандомизация стилей для светлячков
      const randomPositionX = Math.random() * 100; // Случайная начальная позиция по X
      const randomPositionY = Math.random() * 100; // Случайная начальная позиция по Y
      const randomDelay = Math.random() * 20; // Случайная задержка до 20 секунд
      const randomDuration = 20 + Math.random() * 20; // Длительность анимации (20–40 секунд)

      return {
        top: `${randomPositionY}vh`, // Положение по вертикали
        left: `${randomPositionX}vw`, // Положение по горизонтали
        animationDelay: `${randomDelay}s`, // Разная задержка
        animationDuration: `${randomDuration}s`, // Разная скорость
      };
    },
  },
};
</script>

<style>
/* Сброс базовых стилей */
html,
body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  height: 100%;
}

#app {
  position: relative;
  height: 100%;
  overflow: auto;
}

/* Главная тема приложения */
.vue-theme {
  background-color: #1A1A1A;
  color: #ffffff;
  font-family: "Source Sans Pro", sans-serif;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* Стилизация скроллбара для WebKit (Chrome, Edge, Safari) */
::-webkit-scrollbar {
  width: 10px; /* Ширина скроллбара */
}

::-webkit-scrollbar-track {
  background: #1A1A1A; /* Цвет фона трека */
}

::-webkit-scrollbar-thumb {
  background: #42b983; /* Цвет ползунка */
  border-radius: 5px; /* Закругление краев */
}

::-webkit-scrollbar-thumb:hover {
  background: #36966f; /* Цвет ползунка при наведении */
}

/* Стилизация для Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: #42b983 #1A1A1A;
}

/* Контейнер для контента */
.content-area {
  position: relative;
  flex: 1;
  z-index: 1;
}

/* Контейнер для светлячков */
.fireflies {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
  overflow: hidden;
}

/* Один светлячок */
.firefly {
  position: absolute;
  width: 2px; /* Очень маленький кружок */
  height: 2px;
  background-color: #42b983; /* Бирюзовый цвет */
  border-radius: 50%; /* Делает кружок */
  opacity: 0;
  animation: fly ease-in-out infinite, fade ease-in-out infinite;
}

/* Анимация движения светлячков */
@keyframes fly {
  0% {
    transform: translate3d(0, 0, 0) scale(0.5);
  }
  25% {
    transform: translate3d(5vw, 15vh, 0) scale(0.8);
  }
  50% {
    transform: translate3d(-15vw, -20vh, 0) scale(1);
  }
  75% {
    transform: translate3d(15vw, -5vh, 0) scale(1.3);
  }
  100% {
    transform: translate3d(0, 0, 0) scale(0.5);
  }
}

/* Анимация плавного появления и исчезновения */
@keyframes fade {
  0%, 100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}
</style>