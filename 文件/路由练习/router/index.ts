import { createRouter, createWebHashHistory } from "vue-router";

const router=createRouter({
    history:createWebHashHistory(),
    routes:[
        {
            path:'/about',
            name:'about',
            component:()=>import('@/pages/About.vue')
        },
        {
            path:'/home',
            name:'home',
            component:()=>import('@/pages/Home.vue')
        },
        {
            path:'/news',
            name:'news',
            component:()=>import('@/pages/News.vue'),
            children:[
                {
                    path:'detail',
                    name:'detail',
                    component:()=>import('@/pages/Detail.vue')
                }
            ]
        }
    ]
})

export default router