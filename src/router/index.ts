import { PAGE } from "@/constants/pages";
import { useUserStore } from "@/stores/user";
import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/',
            component: () => import('@/pages/AppLayout.vue'),
            children: [
                { path: '', redirect: { name: PAGE.Home } },

                { path: PAGE.Home, name: PAGE.Home, component: () => import('@/pages/HomePage.vue') },
                { path: PAGE.Difficulty, name: PAGE.Difficulty, component: () => import('@/pages/DifficultyPage.vue') },
                { path: PAGE.Game, name: PAGE.Game, component: () => import('@/pages/GamePage.vue') },

                { path: PAGE.Create, name: PAGE.Create, component: () => import('@/pages/CreatePage.vue'),
                  meta: { requiresAuth: true } },
                { path: PAGE.Login, name: PAGE.Login, component: () => import('@/pages/LoginPage.vue') },

                // 占位：我的题目页在批 7 落地；先挂守卫（游客点 → 登录页）
                { path: PAGE.MyPuzzles, name: PAGE.MyPuzzles, redirect: { name: PAGE.Home },
                  meta: { requiresAuth: true } },
            ],
        },
        { path: '/:pathMatch(.*)*', redirect: { name: PAGE.Home } },
    ]
})

/** 未登录访问受保护路由 → 去登录页并带回跳地址 */
router.beforeEach((to) => {
    if (!to.meta.requiresAuth) return true
    const userStore = useUserStore()          // 守卫回调内调用（Pinia 已装好）
    if (!userStore.isGuest) return true
    return { name: PAGE.Login, query: { redirect: to.fullPath } }
})

export default router