import { computed, ref } from 'vue'
import { ACTION, ACTION_OF as actionOf } from '@/constants/actions'
import { fromPuzzle } from '@/core/board/model'
import { parsePuzzle } from '@/core/sudoku/parse'
import type { Actions } from '@/types/item'
import type { BoardRenderInput } from '@/types/render'

/** 预览数据源：题面串必有，答案串可有（未开启 show_solution 时为空） */
export interface PreviewSource {
    puzzleText: string
    solutionText?: string
}

/**
 * 预览遮罩（题目 / 答案共用）：只读、零副作用
 * · 取数由调用方注入（我的题目走 rowId 缓存，搜索页走 pid 详情）
 * · 只负责「加载 → 解析 → 开遮罩」，不碰任何游戏状态
 */
export const usePuzzlePreview = (load: (id: string) => Promise<PreviewSource | null>) => {
    /** 预览自己的缩放，与游玩盘互不影响 */
    const previewOpen = ref(false)
    const previewTitle = ref('')
    /** 盘面数据（zoom / interactive 由本 composable 决定，调用方不用管） */
    const previewBoard = ref<BoardRenderInput>({ board: [], boxSize: 0 })
    const previewLoading = ref(false)

    /** 只读盘：不给交互（**缩放由 BoardView 自己管**） */
    const previewInput = computed<BoardRenderInput>(() => ({
        ...previewBoard.value, interactive: false,
    }))

    const closePreview = (): void => { previewOpen.value = false }

    /** 遮罩里的按钮条：只留关闭（缩放贴在棋盘自己身上，见 BoardView） */
    const previewActions = computed<Actions>(() => [
        actionOf(ACTION.close, closePreview),
    ])

    /** answer=true 看答案预览（仅我的题目），false 看题目预览 */
    const showPreview = async (id: string, answer: boolean, title: string): Promise<void> => {
        previewOpen.value = false
        previewLoading.value = true
        try {
            const src = await load(id)
            const text = answer ? src?.solutionText ?? '' : src?.puzzleText ?? ''
            const parsed = text ? parsePuzzle(text) : null
            if (!parsed) return

            previewTitle.value = title
            previewBoard.value = { board: fromPuzzle(parsed.board, true), boxSize: parsed.boxSize }
            previewOpen.value = true
        } finally {
            previewLoading.value = false
        }
    }

    return { previewOpen, previewTitle, previewInput, previewLoading, previewActions, showPreview, closePreview }
}
