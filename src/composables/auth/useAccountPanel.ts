import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PAGE } from '@/constants/pages'
import { MINE_COPY } from '@/constants/puzzle'
import { AUTH_COPY, UNAME_PATTERN } from '@/constants/user'
import { useSecretValue } from '@/composables/useSecretValue'
import { useUserStore } from '@/stores/user'
import type { ValueIconsProps } from '@/types/item'

/** 自己这条值在 useSecretValue 里的 id（账号区只有一条，固定即可） */
const SELF = 'me'

/**
 * 「我的」页账号区（FR-1 / FR-12）：
 * · 显示名就地重命名（点名字右边「重命名」→ 名字变输入框）→ `PATCH /api/me`
 * · 退出登录（名字左边；顶栏不再放退出）
 * · uid 默认遮蔽，值右侧裸图标 👁 显示 / 📋 复制（与 pid 同规则，复制不进界面）
 */
export const useAccountPanel = () => {
    const userStore = useUserStore()
    const router = useRouter()

    const uname = computed<string>(() => userStore.uname)

    /** uid 的「遮蔽/明文 + 👁📋」：与 pid **同一份实现**（useSecretValue，规则只写一次） */
    const uid = useSecretValue(async () => userStore.uid, {
        tag: MINE_COPY.uidTag, hidden: MINE_COPY.uidHidden,
        show: MINE_COPY.showUid, hide: MINE_COPY.hideUid,
        copy: MINE_COPY.copyUid, copied: MINE_COPY.copied,
    })
    /** 明文时也带 `uid ` 前缀（与遮蔽态 `uid ▮▮▮▮…` 一致，值不会突然换模样） */
    const uidText = computed<string>(() => uid.textOf(SELF))
    const uidIcons = computed<ValueIconsProps>(() => uid.iconsOf(SELF))

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
        uname, uidText, uidIcons,
        renaming, renameText, renameError, startRename, onRenameInput, commitRename, cancelRename,
        logout,
    }
}
