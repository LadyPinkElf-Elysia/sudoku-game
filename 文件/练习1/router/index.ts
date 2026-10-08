import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/',
            name: 'home',
            component: () => import('@/pages/Home.vue')
        },
        {
            path: '/login',
            name: 'login',
            component: () => import('@/pages/Login.vue')
        },
        {
            path: '/404',
            name: '404',
            component: () => import('@/pages/404.vue')
        },
        {
            path: '/:pathMatch(.*)*',
            redirect: '/404'
        }
    ]
})

export default router