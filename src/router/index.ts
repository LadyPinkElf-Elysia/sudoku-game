import { PAGE } from "@/constants/pages";
import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: '/', redirect: { name: PAGE.Home } },
        { path: `/${PAGE.Home}`, name: PAGE.Home, component: () => import('@/pages/HomePage.vue') },
        { path: `/${PAGE.Difficulty}`, name: PAGE.Difficulty, component: () => import('@/pages/DifficultyPage.vue') },
        { path: `/${PAGE.Game}`, name: PAGE.Game, component: () => import('@/pages/GamePage.vue') },
        { path: `/${PAGE.Create}`, name: PAGE.Create, component: () => import('@/pages/CreatePage.vue') },
        // 兜底：手输或失效地址回主页（原来会白屏）
        { path: '/:pathMatch(.*)*', redirect: { name: PAGE.Home } },
    ]
})

export default router