import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from "./store";
import VueTelInput from 'vue-tel-input';
import 'vue-tel-input/vue-tel-input.css';

const app = createApp(App);

const globalOptions = {
    mode: 'auto',
    inputOptions: {
        placeholderText: 'Введіть номер телефону',
    },
};

app.use(router);
app.use(store);
app.use(VueTelInput, globalOptions);
app.mount('#app');