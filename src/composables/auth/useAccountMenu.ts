import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PAGE } from '@/constants/pages'
import { useUserStore } from '@/stores/user'

/**
 * 顶栏右侧账号位（AppLayout 专用）：
 * · 游客「👤 登录」→ 登录页；登录后「👤 用户名」→「我的」页（账号 ID + 我的题目）
 * · 退出登录 → 主动回主页（受保护页不会自己退出）
 */
export const useAccountMenu = () => {
    const userStore = useUserStore()
    const router = useRouter()
    const route = useRoute()

    /** 登录页自己就是入口 → 隐藏右侧那组 */
    const showNav = computed<boolean>(() => route.name !== PAGE.Login)

    const logout = async (): Promise<void> => {
        await userStore.logout()
        await router.replace({ name: PAGE.Home })
    }

    // store 里取出的已是「解包后的值」→ 包一层 computed 才能保持响应
    const isGuest = computed<boolean>(() => userStore.isGuest)
    const uname = computed<string>(() => userStore.uname)

    return { isGuest, uname, showNav, logout }
}
