import { computed, ref } from 'vue'
import { ACTION, actionOf } from '@/constants/actions'
import { EXPORT_COPY } from '@/constants/game'
import { useClipboard } from '@/composables/useClipboard'
import type { Actions } from '@/types/item'

/**
 * 题目串导出（游戏页「📋 导出题目」用；系统出题页不放导出）
 * · **只导题面**：答案不外泄，所以这里只持有题面串
 * · 复制成败写进遮罩说明行（不弹系统提示）
 */
export const usePuzzleExport = () => {
    const open = ref(false)
    const puzzleText = ref('')
    const tip = ref('')
    const { copy } = useClipboard()

    /** 打开遮罩：传题面串（调用方自己决定串从哪来） */
    const show = (nextPuzzleText: string): void => {
        puzzleText.value = nextPuzzleText
        tip.value = ''
        open.value = true
    }

    const close = (): void => { open.value = false }

    const copyPuzzle = async (): Promise<void> => {
        tip.value = (await copy(puzzleText.value))
            ? `${EXPORT_COPY.puzzleShort}已复制`
            : EXPORT_COPY.copyFail
    }

    /** 按钮条：复制题面 + 返回（文案在 constants/actions 的 ACTION 表） */
    const actions = computed<Actions>(() => [
        actionOf(ACTION.copyPuzzle, () => { void copyPuzzle() }),
        actionOf(ACTION.close, close),
    ])

    return { open, puzzleText, tip, actions, show, close }
}
