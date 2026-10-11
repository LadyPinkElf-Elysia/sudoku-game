import '@/styles/card.css'
import '@/styles/form.css'
import { createApp } from "vue";
import App from "./App.vue";
import { createPinia } from "pinia";
import router from "./router/index";
import { useUserStore } from './stores/user';

const app=createApp(App)
const pinia=createPinia()

app.use(pinia)
app.use(router)

useUserStore(pinia).restore()

app.mount('#app')