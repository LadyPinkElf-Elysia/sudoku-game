import { onBeforeUnmount, ref } from 'vue'

/**
 * 一次性提示（页面底部的 `.tip` 行）：**非空时 `duration` 毫秒后自动清空**（配合 `<TipLine>` 的淡出）
 * · 用 `showTip()` 而不是直接写 `tip.value`：**同一句提示再触发也会重新计时**
 * · `showTip('')` = 立刻清空；组件卸载时清掉计时器
 */
export const useTip = (duration = 3000) => {
    const tip = ref('')
    let timer: ReturnType<typeof setTimeout> | undefined

    const clearTip = (): void => {
        if (timer) { clearTimeout(timer); timer = undefined }
        tip.value = ''
    }

    /** 显示一条提示；空字符串就是清空 */
    const showTip = (text: string): void => {
        if (timer) { clearTimeout(timer); timer = undefined }
        tip.value = text
        if (text) timer = setTimeout(() => { timer = undefined; tip.value = '' }, duration)
    }

    onBeforeUnmount(() => { if (timer) clearTimeout(timer) })

    return { tip, showTip, clearTip }
}
