import { PAGE } from "@/constants/enums";
import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: '/', redirect:{name:PAGE.Game} },
        {path:'/game',name:PAGE.Game,component:()=>import('@/pages/GamePage.vue')}
    ]
})

export default router