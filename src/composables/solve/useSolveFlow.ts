import { computed, ref } from 'vue'
import { BOX_SIZE_SELECT_OPTIONS, GAME_INIT_CONFIG } from '@/constants/game'
import { SOLVE_COPY, SOLVE_INPUT_MODE, SOLVE_LIMIT_DEFAULT, SOLVE_MAX_BOX_SIZE } from '@/constants/solve'
import { fromPuzzle } from '@/core/board/model'
import { isBlankBoard } from '@/core/board/ops'
import { defaultZoomOf } from '@/core/board/zoom'
import { errorTextOf } from '@/core/message'
import { parsePuzzle } from '@/core/sudoku/parse'
import { useZoom } from '@/composables/board/useZoom'
import { solveMultiInWorker } from '@/services/sudoku/workerClient'
import { useGameStore } from '@/stores/game'
import type { NumBoard, Position } from '@/types/board'
import type { BoardRenderInput } from '@/types/render'

/** 输入方式（值来自 constants/solve 的 SOLVE_INPUT_MODE） */
type SolveInputMode = typeof SOLVE_INPUT_MODE[keyof typeof SOLVE_INPUT_MODE]

/**
 * 题目求解流程：输入（粘串 / 手填棋盘）→ 本地校验 → Worker 多解 → 结果逐解浏览
 * · 输入盘复用 gameStore 的 Solve 模式（select / inputNum / conflictMask 都是现成的）
 * · 输入盘与结果盘各有自己的缩放；解列表只活在本地，不进 store（R15）
 */
export const useSolveFlow = () => {
    const gameStore = useGameStore()

    const inputMode = ref<SolveInputMode>(SOLVE_INPUT_MODE.Text)
    const puzzleText = ref('')
    const maxSolutions = ref<number>(SOLVE_LIMIT_DEFAULT)
    const solutions = ref<NumBoard[]>([])
    const solutionIndex = ref(0)
    const loading = ref(false)
    const error = ref('')

    /** 输入盘自己的缩放（换盘面大小时跟着复位） */
    const inputZoom = useZoom(defaultZoomOf(GAME_INIT_CONFIG.boxSize))
    /** 结果盘自己的缩放（每次求解后复位） */
    const resultZoom = useZoom()

    // 进页先起一张空盘：不把上一页留下的盘面带过来
    gameStore.startSolve(GAME_INIT_CONFIG.boxSize)

    const boxSize = computed<number>(() => gameStore.config.boxSize)
    const padMax = computed<number>(() => gameStore.sudoku.S)
    const padColumns = computed<number>(() => gameStore.sudoku.B)

    /** 输入盘渲染入参（可玩） */
    const boardInput = computed<BoardRenderInput>(() => ({
        board: gameStore.board,
        boxSize: gameStore.sudoku.B,
        selected: gameStore.selected,
        conflictMask: gameStore.conflictMask,
        zoom: inputZoom.zoom.value,
    }))

    /** 结果盘渲染入参（只读：解本身已填满） */
    const solutionInput = computed<BoardRenderInput>(() => ({
        board: fromPuzzle(solutions.value[solutionIndex.value] ?? [], true),
        boxSize: gameStore.sudoku.B,
        zoom: resultZoom.zoom.value,
        interactive: false,
    }))

    /** 清掉上一轮的解 */
    const resetResult = (): void => {
        solutions.value = []
        solutionIndex.value = 0
    }

    /** 换盘面大小：重建空盘 + 复位输入盘缩放 + 清结果 */
    const setBoxSize = (next: number): void => {
        gameStore.startSolve(next)
        inputZoom.resetZoom(defaultZoomOf(next))
        error.value = ''
        resetResult()
    }

    /** 换输入方式（已输入的内容都保留） */
    const setInputMode = (mode: SolveInputMode): void => {
        inputMode.value = mode
        error.value = ''
    }

    /** 清空棋盘（尺寸不变） */
    const clearBoard = (): void => {
        gameStore.startSolve(gameStore.sudoku.B)
        error.value = ''
        resetResult()
    }

    /**
     * 把题面串解析进棋盘：false = 没成功（已写 error，现有盘面不动）
     * 成功 = 回填棋盘 + 复位输入盘缩放 + 切到「棋盘填入」模式（能看见 / 能改）+ 清旧结果
     */
    const applyText = (): boolean => {
        error.value = ''
        if (!puzzleText.value.trim()) {
            error.value = SOLVE_COPY.blank
            return false
        }
        const parsed = parsePuzzle(puzzleText.value)
        if (!parsed) {
            error.value = SOLVE_COPY.badPuzzle
            return false
        }
        gameStore.startSolve(parsed.boxSize, parsed.board)
        inputZoom.resetZoom(defaultZoomOf(parsed.boxSize))
        inputMode.value = SOLVE_INPUT_MODE.Board
        resetResult()
        return true
    }

    /** 求解前的本地校验：全空 / 盘面过大 / 有冲突 —— 都不值得再让 Worker 跑长回溯 */
    const validate = (): boolean => {
        if (isBlankBoard(gameStore.numBoard)) { error.value = SOLVE_COPY.blank; return false }
        if (gameStore.sudoku.B > SOLVE_MAX_BOX_SIZE) { error.value = SOLVE_COPY.tooBig; return false }
        if (gameStore.sudoku.hasConflict(gameStore.numBoard)) { error.value = SOLVE_COPY.conflict; return false }
        return true
    }

    /** 求解：字符串模式先解析回填棋盘，再本地校验 → Worker 多解；无解由 Worker 回「这盘无解」 */
    const solve = async (): Promise<void> => {
        if (loading.value) return
        error.value = ''
        resetResult()
        if (inputMode.value === SOLVE_INPUT_MODE.Text && !applyText()) return
        if (!validate()) return

        loading.value = true
        try {
            solutions.value = await solveMultiInWorker(gameStore.numBoard, maxSolutions.value)
            resultZoom.resetZoom(defaultZoomOf(gameStore.sudoku.B))
        } catch (err) {
            error.value = errorTextOf(err, SOLVE_COPY.fail)
        } finally {
            loading.value = false
        }
    }

    /** 步骤条切到第 k 个解（越界直接忽略） */
    const changeSolution = (index: number): void => {
        if (index < 0 || index >= solutions.value.length) return
        solutionIndex.value = index
    }

    const selectCell = (pos: Position): void => gameStore.select(pos)
    const inputNum = (n: number): void => gameStore.inputNum(n)

    /** 结果行：找到几个解（到上限说明还有更多解没找） */
    const resultInfo = computed<string>(() => {
        const found = solutions.value.length
        const unit = SOLVE_COPY.solutionUnit
        return found >= maxSolutions.value
            ? `共找到 ${found} ${unit}（${SOLVE_COPY.limitNote} ${maxSolutions.value}）`
            : `共找到 ${found} ${unit}`
    })

    /** 步骤条信息行：第 k / 共 n 个解 */
    const pagerInfo = computed<string>(() =>
        solutions.value.length ? `第 ${solutionIndex.value + 1} / 共 ${solutions.value.length} 个解` : '')

    /** 步骤文案：解 1 / 解 2 … */
    const stepLabel = (index: number): string => `解 ${index + 1}`

    return {
        inputMode, puzzleText, maxSolutions, boxSize, boxSizeOptions: BOX_SIZE_SELECT_OPTIONS,
        solutions, solutionIndex, loading, error,
        boardInput, solutionInput, padMax, padColumns,
        resultInfo, pagerInfo, stepLabel,
        inputZoomActions: inputZoom.zoomActions, resultZoomActions: resultZoom.zoomActions,
        setInputMode, setBoxSize, clearBoard, applyText, solve, changeSolution, selectCell, inputNum,
    }
}
