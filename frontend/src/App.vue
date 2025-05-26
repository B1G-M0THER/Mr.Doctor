<template>
  <div id="app" class="vue-theme">
    <Header />

    <div class="content-area">
      <div class="fireflies">
        <div
            class="firefly"
            v-for="n in 200"
            :key="n"
            :style="generateFireflyStyle()"
        ></div>
      </div>

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
      const randomPositionX = Math.random() * 100;
      const randomPositionY = Math.random() * 100;
      const randomDelay = Math.random() * 20;
      const randomDuration = 20 + Math.random() * 20;

      return {
        top: `${randomPositionY}vh`,
        left: `${randomPositionX}vw`,
        animationDelay: `${randomDelay}s`,
        animationDuration: `${randomDuration}s`,
      };
    },
  },
};
</script>

<style>

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

.vue-theme {
  background-color: #1A1A1A;
  color: #ffffff;
  font-family: "Source Sans Pro", sans-serif;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-track {
  background: #1A1A1A;
}

::-webkit-scrollbar-thumb {
  background: #42b983;
  border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
  background: #36966f;
}

* {
  scrollbar-width: thin;
  scrollbar-color: #42b983 #1A1A1A;
}

.content-area {
  position: relative;
  flex: 1;
  z-index: 1;
}

.fireflies {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
  overflow: hidden;
}

.firefly {
  position: absolute;
  width: 2px;
  height: 2px;
  background-color: #42b983;
  border-radius: 50%;
  opacity: 0;
  animation: fly ease-in-out infinite, fade ease-in-out infinite;
}

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

@keyframes fade {
  0%, 100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}
</style>