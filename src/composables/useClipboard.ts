import { ref } from 'vue'

/**
 * 复制到剪贴板：只关心「成没成」，成败文案由调用方决定
 * （登录页写入表单 error，顶栏弹层写入提示条 tip）
 */
export const useClipboard = () => {
    /** 最近一次是否复制成功（供按钮文案「复制 / 已复制」） */
    const copied = ref(false)

    const copy = async (text: string): Promise<boolean> => {
        try {
            await navigator.clipboard.writeText(text)
            copied.value = true
            return true
        } catch {
            copied.value = false
            return false
        }
    }

    return { copied, copy }
}
