import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ACTION, actionOf } from '@/constants/actions'
import { GAME_COPY, GAME_MODE, GAME_ORIGIN, GAME_STATUS } from '@/constants/game'
import { PAGE } from '@/constants/pages'
import { useGameStore } from '@/stores/game'
import { usePuzzleStore } from '@/stores/puzzle'
import { fromPuzzle } from '@/core/board/model'
import { hintTextOf } from '@/core/game/derive'
import { useZoom } from '@/composables/board/useZoom'
import type { Actions } from '@/types/item'
import type { BoardRenderInput } from '@/types/render'
import { defaultZoomOf } from '@/core/board/zoom'
import { givenBoard } from '@/core/board/ops'
import { boardToStr } from '@/core/sudoku/parse'
import { usePuzzleExport } from '@/composables/usePuzzleExport'

export const useGameFlow = () => {
    const gameStore = useGameStore()
    const puzzleStore = usePuzzleStore()
    const router = useRouter()
    /** 参考答案遮罩自己的缩放，与游玩盘互不影响 */
    const { zoom, zoomActions } = useZoom(defaultZoomOf(gameStore.config.boxSize))

    const tip = ref('')
    /** 参考答案遮罩开关 */
    const answerOpen = ref(false)

    /** ===== 题目导出（只给系统生成的盘）：题面串，**不给答案** ===== */
    const {
        open: exportOpen, puzzleText: exportPuzzleText,
        tip: exportTip, actions: exportActions, show: showExport,
    } = usePuzzleExport()

    const exportPuzzle = (): void => {
        if (!gameStore.board.length) return
        showExport(boardToStr(givenBoard(gameStore.board)))
    }

    /** 遮罩里的只读盘：由答案生成一块独立 Board（与游玩盘无关），整对象交给 Overlay 里的 BoardView */
    const answerInput = computed<BoardRenderInput>(() => ({
        board: gameStore.solution.length ? fromPuzzle(gameStore.solution, true) : [],
        boxSize: gameStore.sudoku.B,
        zoom: zoom.value,
        interactive: false,
    }))
    const answerTitle = '答案'
    /** 遮罩里的按钮条：只留关闭（缩放贴棋盘，见 answerZoomActions） */
    const answerActions = computed<Actions>(() => [
        actionOf(ACTION.closeAnswer, () => { answerOpen.value = false }),
    ])
    /** 贴棋盘正上方的缩放圆圈（左缩小、右放大） */
    const answerZoomActions = computed<Actions>(() => zoomActions.value)

    const goBack = (): void => {
        if (router.options.history.state.back) router.back()
        else router.replace({ name: PAGE.Difficulty })
    }
    const restart = (): void => {
        gameStore.jump(0)
        answerOpen.value = false            // 重开时收起遮罩
    }
    const hint = (): void => {
        const cands = gameStore.selected ? gameStore.getCandidates(gameStore.selected) : []
        tip.value = hintTextOf(gameStore.selectedCell, cands)
    }

    const leadActions = computed<Actions>(() => [
        actionOf(ACTION.back, goBack),
        actionOf(ACTION.restart, restart),
    ])
    const trailActions = computed<Actions>(() => [
        actionOf(ACTION.hint, hint),
        // 只有系统生成的盘才给导出（自定义的串本就在手上、挑战有 pid / 落地页可分享）
        ...(gameStore.origin === GAME_ORIGIN.System ? [actionOf(ACTION.exportPuzzle, exportPuzzle)] : []),
        // 「📖 答案」只给挑战：系统生成的答案由程序算出、自定义的答案是你自己填的 —— 都等于把答案摊在眼前；
        // 挑战是别人出的题，看答案才算「参考答案」（没有答案串的挑战不给按钮，免得点了是空盘）
        ...(gameStore.origin === GAME_ORIGIN.Challenge && gameStore.solution.length
            ? [actionOf(ACTION.answer, () => { answerOpen.value = true })]
            : []),
        ...(import.meta.env.DEV ? [actionOf(ACTION.cheat, gameStore.fillSolution)] : []),
    ])
    /** 通关遮罩：只留重开（回主页走顶栏） */
    const resultActions: Actions = [
        actionOf(ACTION.restart, restart),
    ]
    const winOverlay = computed(() => (gameStore.status === GAME_STATUS.Won ? GAME_COPY.win : null))

    onMounted(() => {
        if (gameStore.mode !== GAME_MODE.Game || !gameStore.board.length) {
            router.replace({ name: PAGE.Difficulty })
            return
        }
        // 自定义「提交到我的题目」成功后的轻提示（一次性，取走即清）
        const saved = puzzleStore.takeSavedTip()
        if (saved) tip.value = saved
    })

    return {
        tip, answerOpen, answerTitle, answerInput, answerActions, answerZoomActions,
        exportOpen, exportPuzzleText, exportTip, exportActions,
        leadActions, trailActions, resultActions, winOverlay,
    }
}
