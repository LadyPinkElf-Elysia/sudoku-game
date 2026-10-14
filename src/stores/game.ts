import { GAME_INIT_CONFIG, GAME_MODE, GAME_ORIGIN, GAME_STATUS } from '@/constants/game'
import { toNum, fromPuzzle } from '@/core/board/model'
import { cloneBoard, lockGiven, applySolution, countBlanks } from '@/core/board/ops'
import { statusOf } from '@/core/game/derive'
import { parsePuzzle } from '@/core/sudoku/parse'
import { cellCountOf } from '@/core/sudoku/shape'
import { getSudoku } from '@/core/sudoku/rules'
import type { Board, Cell, ConflictMask, NumBoard, Position, Snapshot } from '@/types/board'
import type { GameConfig, GameMeta, GameMode, GameOrigin, GameStatus } from '@/types/game'
import type { Sudoku } from '@/types/sudoku'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/** 系统生成 / 自定义开局没有来源信息 */
const EMPTY_META: GameMeta = { pid: '', title: '', uname: '' }

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
        return board.value[r]?.[c] ?? null
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
     * 从题面 / 答案串直接开局（我的题目「挑战」与落地页「挑战」共用）
     * · 解析与比例都在 core；答案串缺失也允许开局（胜负判定走规则，不依赖答案）
     * · 题面串解析失败返回 false，调用方不跳页
     */
    const startFromTexts = (
        puzzleText: string,
        solutionText: string,
        blankCount: number,
        source?: GameMeta,
    ): boolean => {
        const parsed = parsePuzzle(puzzleText)
        if (!parsed) return false
        startGame(parsed.board, parsePuzzle(solutionText)?.board ?? [], {
            boxSize: parsed.boxSize,
            blankRatio: blankCount / cellCountOf(parsed.boxSize),
        }, GAME_ORIGIN.Challenge, source)
        return true
    }
    /**
     * 进入「手填盘面」的模式（出题/编辑 与 题目求解）：只有 mode 不同，其余完全一致
     * puzzle 给了就预填（不锁定 → 可增量改）；没给就按 boxSize 起一张空盘
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

    /** 进入出题 / 编辑：手填题面 */
    const startCreate = (boxSize: number, puzzle?: NumBoard): void => startInput(GAME_MODE.Create, boxSize, puzzle)

    /** 进入题目求解：手填 / 回填题面（求解结果不进 store，见 composables/solve/useSolveFlow） */
    const startSolve = (boxSize: number, puzzle?: NumBoard): void => startInput(GAME_MODE.Solve, boxSize, puzzle)
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
        sudoku, board, numBoard, selected, status, solution, currentStep, meta, origin,

        // 派生
        isWin, snapshots,
        conflictMask, selectedCell,

        // Actions
        startGame, startCreate, startSolve, startFromTexts, lockPuzzle,
        select, inputNum,
        jump, cheat,

        // 提示
        getCandidates,
    }
})
