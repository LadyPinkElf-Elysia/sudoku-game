import { GAME_INIT_CONFIG, GAME_MODE, GAME_ORIGIN, GAME_STATUS } from '@/constants/game'
import { toNum, fromPuzzle } from '@/core/board/model'
import { cloneBoard, lockGiven, applySolution, countBlanks } from '@/core/board/ops'
import { statusOf } from '@/core/game/derive'
import { cellCountOf } from '@/core/sudoku/shape'
import { getSudoku } from '@/core/sudoku/rules'
import type { Board, Cell, ConflictMask, NumBoard, Position, Snapshot } from '@/types/board'
import type { GameConfig, GameMeta, GameMode, GameOrigin, GameSave, GameStatus } from '@/types/game'
import type { Sudoku } from '@/types/sudoku'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/** 系统生成 / 自定义开局没有来源信息 */
const EMPTY_META: GameMeta = { pid: '', title: '', uname: '' }

/**
 * 棋局 store —— **只放「真源 + 规则相关」**（§六 归位原则 / R15）
 * · **真源**：`config` · `mode` · `board` · `selected` · `solution` · `meta` · `origin` · 历史（`snapshots` + `currentStep`）
 * · **规则派生**：`sudoku`（按 B 取规则实例）· `numBoard` · `status` · `isWin` · `conflictMask` · `selectedCell`
 * · **基本操作**：只写上面这些真源，并守住规则不变式（锁题不能改 / 同值不重写 / 赢了不能填）
 * ❌ **不放业务**：解析串、算比例、决定开局来源、跳页、发请求、开关遮罩 —— 那些在 `composables/game/*`
 */
export const useGameStore = defineStore('gameStore', () => {
    const config = ref<GameConfig>({ ...GAME_INIT_CONFIG })
    const mode = ref<GameMode>(GAME_MODE.Game)
    const board = ref<Board>([])
    const selected = ref<Position | null>(null)
    const snapshots = ref<Snapshot[]>([])
    const currentStep = ref<number>(0)
    const solution = ref<NumBoard>([])
    /** 当前盘面来源（FR-11 题目信息行） */
    const meta = ref<GameMeta>({ ...EMPTY_META })
    /** 开局来源（系统生成 / 自定义 / 挑战）——游戏页据此决定给不给「导出题目」 */
    const origin = ref<GameOrigin>(GAME_ORIGIN.System)

    const sudoku = computed<Sudoku>(() => getSudoku(config.value.boxSize))
    const numBoard = computed<NumBoard>(() => toNum(board.value))
    const isWin = computed<boolean>(() => {
        if (mode.value !== GAME_MODE.Game) return false
        if (!numBoard.value.length) return false
        return sudoku.value.isSolved(numBoard.value)
    })
    /** 状态：两个纯函数入参 → 状态（原先手写的三分支已删） */
    const status = computed<GameStatus>(() => statusOf(!!board.value.length, isWin.value))
    /** 冲突集合：空盘走 emptyMask，避免对空 grid 取下标 */
    const conflictMask = computed<ConflictMask>(() =>
        numBoard.value.length ? sudoku.value.findConflicts(numBoard.value) : sudoku.value.makeEmptyMask()
    )
    /** 选中的格子 */
    const selectedCell = computed<Cell | null>(() => {
        if (!selected.value) return null
        const [r, c] = selected.value
        return board.value[r][c] ?? null
    })
    /** 重置历史：清选中 + 以当前盘面为第 0 步（开局/重建/锁题共用） */
    const resetHistory = (): void => {
        selected.value = null
        snapshots.value = [cloneBoard(board.value)]
        currentStep.value = 0
    }
    /** 推入历史记录 */
    const pushHistory = (): void => {
        snapshots.value.splice(currentStep.value + 1)
        snapshots.value.push(cloneBoard(board.value))
        currentStep.value = snapshots.value.length - 1
    }
    /** 某格的候选数 */
    const getCandidates = (pos: Position): number[] =>
        sudoku.value.getCandidates(numBoard.value, pos)

    /** 开始游戏：from = 开局来源；source 给了才有「标题 · 出题人」信息行 */
    const startGame = (puzzle: NumBoard, sol: NumBoard, cfg: GameConfig, from: GameOrigin, source?: GameMeta) => {
        mode.value = GAME_MODE.Game
        origin.value = from
        config.value = { ...cfg }
        board.value = fromPuzzle(puzzle, true)
        solution.value = sol
        meta.value = source ? { ...source } : { ...EMPTY_META }
        resetHistory()
    }
    /**
     * 进入「手填盘面」的模式（出题/编辑 与 题目求解）：只有 mode 不同，其余完全一致
     * puzzle 给了就预填（不锁定 → 可增量改）；没给就按 boxSize 起一张空盘
     * （"出题 / 求解"这类语义与来源判定在上层 composable —— 这里只认 `mode` 这个数据）
     */
    const startInput = (nextMode: GameMode, boxSize: number, puzzle?: NumBoard): void => {
        mode.value = nextMode
        config.value = {
            boxSize,
            blankRatio: puzzle ? countBlanks(puzzle) / cellCountOf(boxSize) : 0,
        }
        board.value = puzzle ? fromPuzzle(puzzle, false) : getSudoku(boxSize).makeEmptyBoard()
        solution.value = []
        meta.value = { ...EMPTY_META }
        resetHistory()
    }

    /**
     * 读档：把存档里的真源写回来（派生值自动重算；历史与当前步一并恢复）
     * · 只写 `startGame` 会写的那几个字段，外加历史/当前步/选中 —— 不做任何"校验/修正"
     *   （结构校验在 services/saveGame.ts 的 isSave；这里只认已经合法的数据）
     */
    const restoreGame = (save: GameSave): void => {
        mode.value = GAME_MODE.Game
        origin.value = save.origin
        config.value = { ...save.config }
        meta.value = { ...save.meta }
        solution.value = save.solution
        snapshots.value = save.snapshots.map(cloneBoard)
        currentStep.value = save.currentStep
        board.value = cloneBoard(snapshots.value[save.currentStep])
        selected.value = save.selected
    }

    /** 提交题面：锁定规则在 core，这里只写回 */
    const lockPuzzle = (): void => {
        board.value = lockGiven(board.value)
        resetHistory()
    }
    /** 选择格子 */
    const select = (pos: Position): void => {
        selected.value = pos
    }
    /** 向格子输入数字 */
    const inputNum = (n: number): void => {
        if (status.value !== GAME_STATUS.Playing) return
        if (!selected.value) return

        const [r, c] = selected.value
        const cell = board.value[r][c]

        if (cell.lock) return
        if (cell.v === n) return
        cell.v = n
        pushHistory()
    }
    /** 跳到指定历史步 */
    const jump = (step: number): void => {
        if (step < 0 || step >= snapshots.value.length) return
        board.value = cloneBoard(snapshots.value[step])
        currentStep.value = step
    }
    /** 按答案一次性填盘（DEV 的「⚡ 作弊」按钮用它）—— 填法在 core，这里只写回 + 记一步 */
    const fillSolution = (): void => {
        if (!solution.value.length) return
        board.value = applySolution(board.value, solution.value)
        pushHistory()
    }

    return {
        // 真源（配置 · 盘面 · 历史）
        config, mode, board, selected, solution, meta, origin, snapshots, currentStep,

        // 规则派生
        sudoku, numBoard, status, isWin, conflictMask, selectedCell,

        // 基本操作（只写上面的真源；开局只有"给定数据"的两个入口 + 读档）
        startGame, startInput, restoreGame, select, inputNum, jump, lockPuzzle, fillSolution,

        // 规则查询
        getCandidates,
    }
})
