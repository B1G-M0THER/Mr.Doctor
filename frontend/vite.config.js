import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    include: ['vue-tel-input'], // Добавьте сюда 'vue-tel-input'
  },
  resolve: {
    alias: {
      vue: 'vue/dist/vue.esm-bundler.js', // Убедиться, что используются правильные сборки Vue
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000", // Адрес вашего бекенда
        changeOrigin: true,
      },
    },
  },

});