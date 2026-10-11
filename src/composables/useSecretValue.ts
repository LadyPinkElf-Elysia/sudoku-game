import { ref } from 'vue'
import { useClipboard } from './useClipboard'
import type { ValueIconsProps } from '@/types/item'

/** 遮蔽 / 明文那套文案（pid 与 uid 各给一份，规则完全相同） */
export interface SecretCopy {
    /** 值前缀（明文时也保留：`pid <值>` / `uid <值>`，值不会突然换模样） */
    tag: string
    /** 遮蔽态文本（`pid ▮▮▮▮…`） */
    hidden: string
    show: string
    hide: string
    copy: string
    copied: string
}

/**
 * 「值 + 遮蔽/明文 + 👁📋」通用逻辑 —— **uid 与 pid 同规则，全站只此一份实现**：
 * · `load(id)` 现取真值（「我的题目」按 rowId 取详情；uid 直接返回自己的）
 * · 明文 = `${tag} ${真值}`、遮蔽 = `hidden`；👁 是睁/闭两态切换
 * · 📋 复制不进界面，直接进剪贴板；每条的明文状态按 id 各自记忆
 */
export const useSecretValue = (load: (id: string) => Promise<string | null>, copy: SecretCopy) => {
    const { copied, copy: toClipboard } = useClipboard()
    /** 已点开明文的值 id */
    const revealed = ref<string[]>([])
    /** 已取到的真值（按 id 缓存，避免每次渲染都请求） */
    const values = ref<Record<string, string>>({})

    const isRevealed = (id: string): boolean => revealed.value.includes(id)

    /** 该 id 当前该显示的文本（遮蔽 / 明文） */
    const textOf = (id: string): string =>
        (isRevealed(id) && values.value[id] ? `${copy.tag} ${values.value[id]}` : copy.hidden)

    /** 值右侧裸图标组参数（👁 睁/闭 + 📋 复制 / ✅ 已复制） */
    const iconsOf = (id: string): ValueIconsProps => ({
        revealed: isRevealed(id),
        eyeLabel: isRevealed(id) ? copy.hide : copy.show,
        copyIcon: copied.value ? '✅' : '📋',
        copyLabel: copied.value ? copy.copied : copy.copy,
        onToggle: () => { void toggle(id) },
        onCopy: () => { void copyValue(id) },
    })

    const toggle = async (id: string): Promise<void> => {
        if (isRevealed(id)) { revealed.value = revealed.value.filter((x) => x !== id); return }
        const value = await load(id)
        if (!value) return
        values.value = { ...values.value, [id]: value }
        revealed.value = [...revealed.value, id]
    }

    const copyValue = async (id: string): Promise<void> => {
        const value = await load(id)
        if (value) await toClipboard(value)
    }

    return { textOf, iconsOf }
}
