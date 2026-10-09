import { PAGE } from "@/constants/pages";
import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: '/', redirect: { name: PAGE.Difficulty } },
        { path: '/difficulty', name: PAGE.Difficulty, component: () => import('@/pages/DifficultyPage.vue') },
        { path: '/game', name: PAGE.Game, component: () => import('@/pages/GamePage.vue') }
    ]
})

export default router