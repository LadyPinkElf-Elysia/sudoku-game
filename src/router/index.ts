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

        // 难度页：壳 + 子路由（'' → redirect 系统生成，实现"不记忆"）
        {
          path: PAGE.Difficulty,
          name: PAGE.Difficulty,
          component: () => import('@/pages/DifficultyPage.vue'),
          children: [
            { path: '', redirect: { name: PAGE.DifficultySystem } },
            {
              path: 'system', name: PAGE.DifficultySystem,
              component: () => import('@/pages/difficulty/SystemPage.vue')
            },
            {
              path: 'custom', name: PAGE.DifficultyCustom,
              component: () => import('@/pages/difficulty/CustomPage.vue')
            },
          ],
        },

        { path: PAGE.Game, name: PAGE.Game, component: () => import('@/pages/GamePage.vue') },

        {
          path: PAGE.Create, name: PAGE.Create, component: () => import('@/pages/CreatePage.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: '/puzzle/:pid/edit', name: PAGE.EditPuzzle,
          component: () => import('@/pages/EditPuzzlePage.vue'),
          meta: { requiresAuth: true }
        },
        { path: PAGE.Login, name: PAGE.Login, component: () => import('@/pages/LoginPage.vue') },

        // 搜索（公开）+ 落地页（分享入口，path 固定 /p/:pid）
        { path: PAGE.Search, name: PAGE.Search, component: () => import('@/pages/SearchPage.vue') },
        { path: '/p/:pid', name: PAGE.PuzzleView, component: () => import('@/pages/PuzzleViewPage.vue') },

        // 我的题目（需登录；?sort=&page=）
        {
          path: PAGE.MyPuzzles, name: PAGE.MyPuzzles,
          component: () => import('@/pages/MyPuzzlesPage.vue'),
          meta: { requiresAuth: true }
        },
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
