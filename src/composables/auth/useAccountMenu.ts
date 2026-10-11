import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PAGE } from '@/constants/pages'
import { AUTH_COPY } from '@/constants/user'
import { useClipboard } from '@/composables/useClipboard'
import { useUserStore } from '@/stores/user'

/**
 * 顶栏账号区（AppLayout 专用）：
 * · 「我的题目」灰显时的本页提示条（路由一变即清）
 * · 用户名弹层：查看 / 复制自己的 uid
 * · 退出登录 → 主动回主页（受保护页不会自己退出）
 */
export const useAccountMenu = () => {
    const userStore = useUserStore()
    const router = useRouter()
    const route = useRoute()
    const { copied, copy } = useClipboard()

    /** 未登录点灰显入口的提示；路由一变就清掉（无需 timer） */
    const tip = ref('')
    watch(() => route.fullPath, () => { tip.value = '' })

    /** 登录页自己就是入口 → 隐藏右侧那组 */
    const showNav = computed<boolean>(() => route.name !== PAGE.Login)

    /** 游客点「我的题目」：不导航，只提示 */
    const onMineBlocked = (): void => { tip.value = AUTH_COPY.needLogin }

    /** 用户名弹层 */
    const cardOpen = ref(false)
    const openCard = (): void => { copied.value = false; cardOpen.value = true }
    const closeCard = (): void => { cardOpen.value = false }

    const copyUid = async (): Promise<void> => {
        if (!(await copy(userStore.uid))) tip.value = AUTH_COPY.copyFailed
    }

    const logout = async (): Promise<void> => {
        await userStore.logout()
        await router.replace({ name: PAGE.Home })
    }

    // store 里取出的已是「解包后的值」→ 包一层 computed 才能保持响应
    const isGuest = computed<boolean>(() => userStore.isGuest)
    const uname = computed<string>(() => userStore.uname)
    const uid = computed<string>(() => userStore.uid)

    return {
        isGuest, uname, uid, tip, showNav, onMineBlocked,
        cardOpen, copied, openCard, closeCard, copyUid, logout
    }
}
