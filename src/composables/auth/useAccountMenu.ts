import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { PAGE } from '@/constants/pages'
import { useUserStore } from '@/stores/user'

/**
 * 顶栏右侧账号位（AppLayout 专用）：
 * · 游客「👤 登录」→ 登录页；登录后「👤 用户名」→「我的」页（账号区 + 我的题目）
 * · 退出登录已移到「我的」页账号区（显示名左边），顶栏不再放退出
 */
export const useAccountMenu = () => {
    const userStore = useUserStore()
    const route = useRoute()

    /** 登录页自己就是入口 → 隐藏右侧那组 */
    const showNav = computed<boolean>(() => route.name !== PAGE.Login)

    // store 里取出的已是「解包后的值」→ 包一层 computed 才能保持响应
    const isGuest = computed<boolean>(() => userStore.isGuest)
    const uname = computed<string>(() => userStore.uname)

    return { isGuest, uname, showNav }
}
