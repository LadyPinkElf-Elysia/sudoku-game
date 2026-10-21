import 'element-plus/dist/index.css'
import '@/styles/card.css'
import '@/styles/form.css'
import '@/styles/overlay.css'
import { ElLoading } from 'element-plus'
import { createApp } from "vue";
import App from "./App.vue";
import { createPinia } from "pinia";
import router from "./router/index";
import { useUserStore } from './stores/user';

const app = createApp(App)
const pinia = createPinia()

/** v-loading（遮罩的"加载中"与页面级 loading 都用它） */
app.use(ElLoading)
app.use(pinia)
app.use(router)

useUserStore(pinia).restore()

app.mount('#app')