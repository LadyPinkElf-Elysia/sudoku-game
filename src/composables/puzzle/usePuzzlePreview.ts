import { ref } from 'vue'
import { fromPuzzle } from '@/core/board/model'
import { parsePuzzle } from '@/core/sudoku/parse'
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
    const previewOpen = ref(false)
    const previewTitle = ref('')
    const previewInput = ref<BoardRenderInput>({ board: [], boxSize: 0 })
    const previewLoading = ref(false)

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
            previewInput.value = { board: fromPuzzle(parsed.board, true), boxSize: parsed.boxSize }
            previewOpen.value = true
        } finally {
            previewLoading.value = false
        }
    }

    const closePreview = (): void => { previewOpen.value = false }

    return { previewOpen, previewTitle, previewInput, previewLoading, showPreview, closePreview }
}
