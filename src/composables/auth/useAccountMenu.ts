import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PAGE } from '@/constants/pages'
import { AUTH_COPY } from '@/constants/user'
import { useUserStore } from '@/stores/user'

/**
 * 顶栏账号区（AppLayout 专用）：
 * · 「我的题目」灰显时的本页提示条（路由一变即清）
 * · 「👤 用户名」是进入「我的」页的入口（uid 的显示/复制在那一页）
 * · 退出登录 → 主动回主页（受保护页不会自己退出）
 */
export const useAccountMenu = () => {
    const userStore = useUserStore()
    const router = useRouter()
    const route = useRoute()

    /** 未登录点灰显入口的提示；路由一变就清掉（无需 timer） */
    const tip = ref('')
    watch(() => route.fullPath, () => { tip.value = '' })

    /** 登录页自己就是入口 → 隐藏右侧那组 */
    const showNav = computed<boolean>(() => route.name !== PAGE.Login)

    /** 游客点「我的题目」：不导航，只提示 */
    const onMineBlocked = (): void => { tip.value = AUTH_COPY.needLogin }

    const logout = async (): Promise<void> => {
        await userStore.logout()
        await router.replace({ name: PAGE.Home })
    }

    // store 里取出的已是「解包后的值」→ 包一层 computed 才能保持响应
    const isGuest = computed<boolean>(() => userStore.isGuest)
    const uname = computed<string>(() => userStore.uname)

    return { isGuest, uname, tip, showNav, onMineBlocked, logout }
}
