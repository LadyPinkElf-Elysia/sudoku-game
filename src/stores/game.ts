import { GAME_INIT_CONFIG, GAME_MODE, GAME_STATUS, } from "@/constants/game";
import { makeGrid, mapGrid } from "@/utils/grid";
import { toNum, fromPuzzle } from "@/utils/sudoku/transform";
import { getSudoku } from "@/utils/sudoku/getSudoku";
import type { Sudoku } from "@/utils/sudoku/sudoku";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { Board, Position, Snapshot, NumBoard, Cell, ConflictMask } from "@/types/board";
import { type GameConfig, type GameMode, type GameStatus, } from "@/types/game";
import { cloneBoard } from "@/utils/board";

export const useGameStore = defineStore('gameStore', () => {
    const config = ref<GameConfig>({ ...GAME_INIT_CONFIG })
    const mode = ref<GameMode>(GAME_MODE.Game)
    const board = ref<Board>([])
    const selected = ref<Position | null>(null)
    const snapshots = ref<Snapshot[]>([])
    const currentStep = ref<number>(0)
    const solution = ref<NumBoard>([])

    const sudoku = computed<Sudoku>((): Sudoku => getSudoku(config.value.boxSize))
    const numBoard = computed<NumBoard>((): NumBoard => toNum(board.value))
    const isWin = computed<boolean>(() => {
        if (mode.value !== GAME_MODE.Game) return false
        if (!numBoard.value.length) return false
        return sudoku.value.isSolved(numBoard.value)
    })
    const status = computed<GameStatus>((): GameStatus => {
        if (isWin.value) return GAME_STATUS.Won
        if (!board.value.length) return GAME_STATUS.Idle
        return GAME_STATUS.Playing
    })
    /**冲突集合*/
    const conflictMask = computed<ConflictMask>((): ConflictMask => {
        if (!numBoard.value.length) return makeGrid(sudoku.value.S, () => false)
        return sudoku.value.findConflicts(numBoard.value)
    })
    /**选中的格子*/
    const selectedCell = computed<Cell | null>(() => {
        if (!selected.value) return null
        const [r, c] = selected.value
        return board.value[r]?.[c] ?? null
    })
    /**推入历史记录*/
    const pushHistory = (): void => {
        snapshots.value.splice(currentStep.value + 1)
        snapshots.value.push(cloneBoard(board.value))
        currentStep.value = snapshots.value.length - 1
    }
    /** 某格的候选数 */
    const getCandidates = (pos: Position): number[] => {
        return sudoku.value.candidates(numBoard.value, pos)
    }
    /**开始游戏*/
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
        board.value = sudoku.value.emptyBoard()
        solution.value = []
        selected.value = null
        snapshots.value = [cloneBoard(board.value)]
        currentStep.value = 0
    }
    const lockPuzzle = (): void => {
        board.value = mapGrid(board.value, cell => ({ v: cell.v, lock: cell.v !== 0 }))
        selected.value = null
        snapshots.value = [cloneBoard(board.value)]
        currentStep.value = 0
    }
    /**选择格子*/
    const select = (pos: Position): void => {
        selected.value = pos
    }
    /**向格子输入数字*/
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
    /**跳到指定历史步*/
    const jump = (step: number): void => {
        if (step < 0 || step >= snapshots.value.length) return
        board.value = cloneBoard(snapshots.value[step])
        currentStep.value = step
    }
    /** 作弊：直接填入答案（测试用） */
    const cheat = (): void => {
        if (!solution.value.length) return
        for (let r = 0; r < board.value.length; r++) {
            for (let c = 0; c < board.value[r].length; c++) {
                board.value[r][c].v = solution.value[r][c]
            }
        }
        pushHistory()
    }

    return {
        // 配置
        config, mode,

        // 状态
        sudoku,board,numBoard, selected, status, solution,currentStep,

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

export type GameStore = ReturnType<typeof useGameStore>