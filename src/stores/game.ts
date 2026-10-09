import { GAME_CONFIG } from "@/constants/game";
import { mapGrid } from "@/utils/array";
import { toNum, fromPuzzle } from "@/utils/sudoku/transform";
import { getSudoku } from "@/utils/sudoku/cache";
import type { Sudoku } from "@/utils/sudoku/factory";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { Board, Position, Snapshot, NumBoard, Cell } from "@/types/board";
import { type GameConfig, type GameStatus, GAME_STATUS } from "@/types/game";

export const useGameStore = defineStore('gameStore', () => {
    const config = ref<GameConfig>({ ...GAME_CONFIG })

    const board = ref<Board>([])

    const selected = ref<Position | null>(null)

    const history = ref<Snapshot[]>([])

    const stepPtr = ref<number>(-1)

    const sudoku = computed<Sudoku>((): Sudoku => getSudoku(config.value.boxSize))

    const numBoard = computed<NumBoard>((): NumBoard => toNum(board.value))

    const steps = computed(() => stepPtr.value)

    const isWin = computed<boolean>(() => {
        if (!numBoard.value.length) return false
        return sudoku.value.isSolved(numBoard.value)
    })

    const isLost = computed<boolean>((): boolean => steps.value >= config.value.maxSteps)

    const isGameOver = computed<boolean>((): boolean => isWin.value || isLost.value)

    const status = computed<GameStatus>((): GameStatus => {
        if (isWin.value) return GAME_STATUS.Won
        if (isLost.value) return GAME_STATUS.Lost
        if (!board.value.length) return GAME_STATUS.Idle
        return GAME_STATUS.Playing
    })

    /**冲突集合*/
    const conflictSet = computed<Set<string>>((): Set<string> => {
        const s = new Set<string>()
        if (!numBoard.value.length) return s
        const mask = sudoku.value.findConflicts(numBoard.value)
        mask.forEach((row, r) => row.forEach((b, c) => b && s.add(`${r},${c}`)))
        return s
    })

    /**选中的格子*/
    const selectedCell = computed<Cell | null>(() => {
        if (!selected.value) return null
        const [r, c] = selected.value
        return board.value[r]?.[c] ?? null
    })

    /**能否撤回*/
    const canUndo = computed<boolean>((): boolean => !isGameOver.value && stepPtr.value > 0)

    /**能否重做*/
    const canRedo = computed<boolean>((): boolean => !isGameOver.value && stepPtr.value < history.value.length - 1)

    /**消息*/
    const message = computed<string>((): string => {
        if (status.value === GAME_STATUS.Won) return '恭喜成功'
        if (status.value === GAME_STATUS.Lost) return '遗憾失败'
        if (status.value === GAME_STATUS.Playing && config.value) return `还剩${config.value.maxSteps - steps.value}步`
        return ''
    })

    const cloneBoard = (b: Board): Board => mapGrid(b, cell => ({ ...cell }))

    /**推入历史记录*/
    const pushHistory = (): void => {
        history.value.splice(steps.value + 1)
        history.value.push(cloneBoard(board.value))
        stepPtr.value = history.value.length - 1
    }

    /** 某格的候选数 */
    const getCandidates = (pos: Position): number[] => {
        return sudoku.value.candidates(numBoard.value, pos)
    }

    /** 某格能否填 n */
    const canPlace = (pos: Position, n: number): boolean => {
        return sudoku.value.canPlace(numBoard.value, pos, n)
    }

    /**开始游戏*/
    const startFromPuzzle = (puzzle: NumBoard, cfg: GameConfig) => {
        config.value = { ...cfg }
        board.value = fromPuzzle(puzzle, true)
        selected.value = null
        history.value = [cloneBoard(board.value)]
        stepPtr.value = 0
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
        if (step < 0 || step >= history.value.length) return
        board.value = cloneBoard(history.value[step])
        stepPtr.value = step
    }

    /**撤销*/
    const undo = (): void => {
        if (!canUndo.value) return
        jump(steps.value - 1)
    }

    /**重做*/
    const redo = (): void => {
        if (!canRedo.value) return
        jump(steps.value + 1)
    }

    return {
        // 配置
        config,

        // 状态
        board, selected, status, message,

        // 派生
        isWin, isLost, isGameOver, steps, history,
        conflictSet, selectedCell,
        canUndo, canRedo,

        // Actions
        startFromPuzzle, select, inputNum,
        jump, undo, redo,

        // 提示
        getCandidates, canPlace,
    }
})

export type GameStore = ReturnType<typeof useGameStore>