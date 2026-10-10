import { GAME_INIT_CONFIG, GAME_MODE, GAME_STATUS } from '@/constants/game'
import { toNum, fromPuzzle } from '@/core/board/model'
import { cloneBoard, lockGiven, applySolution } from '@/core/board/ops'
import { statusOf } from '@/core/game/derive'
import { getSudoku } from '@/core/sudoku/rules'
import type { Board, Cell, ConflictMask, NumBoard, Position, Snapshot } from '@/types/board'
import type { GameConfig, GameMode, GameStatus } from '@/types/game'
import type { Sudoku } from '@/types/sudoku'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useGameStore = defineStore('gameStore', () => {
    const config = ref<GameConfig>({ ...GAME_INIT_CONFIG })
    const mode = ref<GameMode>(GAME_MODE.Game)
    const board = ref<Board>([])
    const selected = ref<Position | null>(null)
    const snapshots = ref<Snapshot[]>([])
    const currentStep = ref<number>(0)
    const solution = ref<NumBoard>([])

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
        return board.value[r]?.[c] ?? null
    })
    /** 推入历史记录 */
    const pushHistory = (): void => {
        snapshots.value.splice(currentStep.value + 1)
        snapshots.value.push(cloneBoard(board.value))
        currentStep.value = snapshots.value.length - 1
    }
    /** 某格的候选数 */
    const getCandidates = (pos: Position): number[] =>
        sudoku.value.getCandidates(numBoard.value, pos)

    /** 开始游戏 */
    const startGame = (puzzle: NumBoard, sol: NumBoard, cfg: GameConfig) => {
        mode.value = GAME_MODE.Game
        config.value = { ...cfg }
        board.value = fromPuzzle(puzzle, true)
        solution.value = sol
        selected.value = null
        snapshots.value = [cloneBoard(board.value)]
        currentStep.value = 0
    }
    const startCreate = (boxSize: number): void => {
        mode.value = GAME_MODE.Create
        config.value = { boxSize, blankRatio: 0 }
        board.value = sudoku.value.makeEmptyBoard()
        solution.value = []
        selected.value = null
        snapshots.value = [cloneBoard(board.value)]
        currentStep.value = 0
    }
    /** 提交题面：锁定规则在 core，这里只写回 */
    const lockPuzzle = (): void => {
        board.value = lockGiven(board.value)
        selected.value = null
        snapshots.value = [cloneBoard(board.value)]
        currentStep.value = 0
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
    /** 作弊：直接填入答案（测试用）—— 填法在 core */
    const cheat = (): void => {
        if (!solution.value.length) return
        board.value = applySolution(board.value, solution.value)
        pushHistory()
    }

    return {
        // 配置
        config, mode,

        // 状态
        sudoku, board, numBoard, selected, status, solution, currentStep,

        // 派生
        isWin, snapshots,
        conflictMask, selectedCell,

        // Actions
        startGame, startCreate, lockPuzzle,
        select, inputNum,
        jump, cheat,

        // 提示
        getCandidates,
    }
})


