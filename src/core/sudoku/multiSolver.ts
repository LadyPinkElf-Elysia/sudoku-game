// ============================================================
// core/sudoku/multiSolver.ts
// 多解器：一次枚举「至多 N 个解」
//   对外：solveLimitOf(max) · solvePuzzleMulti(board, rng, max)
//   与求解器共用同一份回溯引擎（solver.solveGrid），只换停止策略：
//     求解器 → 找到第一盘就停
//     多解器 → 每找到一盘就存下，存够上限才停
// ============================================================

import type { NumBoard } from '../../types/board'
import type { Rng } from '../../types/rng'
import { getSudoku } from './rules'
import { boxSizeOf } from './shape'
import { solveGrid } from './solver'

/** 单次枚举的硬上限（防止 UI 传入过分大的值把 Worker 占住） */
const MAX_SOLUTIONS = 50

/** 解数上限归一化：非整数向下取整，收敛到 1 ~ MAX_SOLUTIONS */
export const solveLimitOf = (maxSolutions: number): number =>
    Math.min(MAX_SOLUTIONS, Math.max(1, Math.floor(maxSolutions)))

/**
 * 多解枚举：直接回**解列表**（`[]` = 一个解都没找到，题面由调用方自己拿着）
 * · 尺寸不是合法方阵 / 题面自带冲突 → `[]`
 * · 解的先后顺序由注入的 rng 决定（同一盘面多次求解，解集相同、顺序可能不同）
 * · 页面自己也会先判一次冲突（省一次 Worker 往返），这里的守卫是给其它调用方的
 */
export const solvePuzzleMulti = (
    board: NumBoard,
    rng: Rng,
    maxSolutions: number,
): NumBoard[] => {
    const boxSize = boxSizeOf(board.length)
    if (boxSize === null) return []
    if (getSudoku(boxSize).hasConflict(board)) return []

    const limit = solveLimitOf(maxSolutions)
    const solutions: NumBoard[] = []
    solveGrid(board.map(row => [...row]), boxSize, rng, solved => {
        solutions.push(solved)
        return solutions.length >= limit
    })
    return solutions
}
