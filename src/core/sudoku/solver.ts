import type { NumBoard } from '../../types/board'
import type { Rng } from '../../types/rng'
import { shuffle } from '../array'
import { getSudoku } from './rules'
import { boxSizeOf, sideOf } from './shape'
import { createTracker } from './tracker'

/**
 * 回溯引擎（求解器内核）——「单解」与「多解」共用这一份，区别只在停止策略：
 * · 每凑满一盘就调一次 onSolution（传的是拷贝，引擎不会把它改掉），回调返回 true = 立刻停止搜索
 * · 引擎就地改 grid（调用方传自己的副本）；步数超过 maxIter 也停（保险丝，防死循环）
 * 挑格用 tracker 的 MRV；随机只来自注入的 rng（core 纯度，R3）
 */
export const solveGrid = (
    grid: NumBoard,
    boxSize: number,
    rng: Rng,
    onSolution: (solved: NumBoard) => boolean,
    maxIter = 20_000_000,
): void => {
    const S = sideOf(boxSize)
    const { pickCell, candidatesOf, place } = createTracker(S, boxSize, grid)
    let iter = 0
    let stop = false

    const dfs = (): void => {
        if (stop) return
        if (++iter > maxIter) {
            stop = true
            return
        }

        const { r, c, full, dead } = pickCell()
        if (dead) return
        if (full) {
            if (onSolution(grid.map(row => [...row]))) stop = true
            return
        }

        const list = candidatesOf(r, c)
        shuffle(list, rng)

        for (const n of list) {
            if (stop) return
            const undo = place(r, c, n)
            dfs()
            undo()
        }
    }

    dfs()
}

/**
 * 求解（单解）：盘面副本 → 第一个解
 * 尺寸不是合法方阵 / 题面自带冲突 / 无解 → null
 * （冲突必须先拦：引擎只负责「填空」，不会重判盘面上已有的数字）
 */
export const solvePuzzle = (board: NumBoard, rng: Rng): NumBoard | null => {
    const boxSize = boxSizeOf(board.length)
    if (boxSize === null) return null
    if (getSudoku(boxSize).hasConflict(board)) return null

    const found: NumBoard[] = []
    solveGrid(board.map(row => [...row]), boxSize, rng, solved => {
        found.push(solved)
        return true
    })
    return found[0] ?? null
}
