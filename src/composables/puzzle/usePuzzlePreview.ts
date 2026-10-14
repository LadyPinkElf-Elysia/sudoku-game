import { computed, ref } from 'vue'
import { fromPuzzle } from '@/core/board/model'
import { parsePuzzle } from '@/core/sudoku/parse'
import { useZoom } from '@/composables/board/useZoom'
import type { Actions } from '@/types/item'
import type { BoardRenderInput } from '@/types/render'
import { defaultZoomOf } from '@/core/board/zoom'

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
export const usePuzzlePreview = (load: (id: string) => Promise<PreviewSource | null>, closeText = '返回') => {
    /** 预览自己的缩放，与游玩盘互不影响 */
    const previewOpen = ref(false)
    const previewTitle = ref('')
    /** 盘面数据（zoom / interactive 由本 composable 决定，调用方不用管） */
    const previewBoard = ref<BoardRenderInput>({ board: [], boxSize: 0 })
    const previewLoading = ref(false)
    const { zoom, resetZoom, zoomActions } = useZoom(defaultZoomOf(previewBoard.value.boxSize))

    /** 只读盘：不给交互，只给缩放 */
    const previewInput = computed<BoardRenderInput>(() => ({
        ...previewBoard.value, zoom: zoom.value, interactive: false,
    }))

    const closePreview = (): void => { previewOpen.value = false }

    /** 遮罩里的按钮条：只留关闭（缩放贴棋盘，见 previewZoomActions） */
    const previewActions = computed<Actions>(() => [
        { key: 'close', text: `↩ ${closeText}`, onClick: closePreview },
    ])

    /** 贴棋盘正上方的缩放圆圈（左缩小、右放大） */
    const previewZoomActions = computed<Actions>(() => zoomActions.value)

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
            resetZoom()
            previewOpen.value = true
        } finally {
            previewLoading.value = false
        }
    }

    return { previewOpen, previewTitle, previewInput, previewLoading, previewActions, previewZoomActions, showPreview, closePreview }
}
