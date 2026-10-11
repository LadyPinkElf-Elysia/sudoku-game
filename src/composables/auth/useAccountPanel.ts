import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PAGE } from '@/constants/pages'
import { AUTH_COPY, UNAME_PATTERN } from '@/constants/user'
import { useUserStore } from '@/stores/user'

/**
 * 「我的」页账号区（FR-1 / FR-12）：
 * · 显示名就地重命名（点名字右边「重命名」→ 名字变输入框）→ `PATCH /api/me`
 * · 退出登录（名字左边；顶栏不再放退出）
 * · uid 默认遮蔽，点 👁 显示 / 📋 复制 —— 整套在 SecretValue 组件里，这里只给「怎么取真值」
 */
export const useAccountPanel = () => {
    const userStore = useUserStore()
    const router = useRouter()

    const uname = computed<string>(() => userStore.uname)

    /** uid 的取值（uid 是登录凭据，默认不给出去） */
    const loadUid = async (): Promise<string | null> => userStore.uid

    /** 就地重命名：非法（2~16 位）→ 留在输入框并给提示；没改 → 直接收起 */
    const renaming = ref(false)
    const renameText = ref('')
    const renameError = ref('')
    const startRename = (): void => { renaming.value = true; renameText.value = userStore.uname; renameError.value = '' }
    const cancelRename = (): void => { renaming.value = false; renameError.value = '' }
    const onRenameInput = (text: string): void => { renameText.value = text; renameError.value = '' }
    const commitRename = async (): Promise<void> => {
        if (!renaming.value) return
        const name = renameText.value.trim()
        if (!UNAME_PATTERN.test(name)) { renameError.value = AUTH_COPY.unameInvalid; return }
        renaming.value = false
        if (name !== userStore.uname) await userStore.rename(name)
    }

    /** 退出：先删后端 session，再回主页（受保护页不会自己退出） */
    const logout = async (): Promise<void> => {
        await userStore.logout()
        await router.replace({ name: PAGE.Home })
    }

    return {
        uname, loadUid,
        renaming, renameText, renameError, startRename, onRenameInput, commitRename, cancelRename,
        logout,
    }
}
