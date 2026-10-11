import type { NumBoard } from '../../types/board'
import type { Rng } from '../../types/rng'
import { makeGrid, shuffle } from '../array'
import { createTracker } from './tracker'

/** 预先填满对角线上的宫格：每宫一个 1..S 的随机排列（对角线各宫互不冲突） */
const fillDiagonal = (grid: NumBoard, B: number, S: number, rng: Rng): void => {
    for (let b = 0; b < S; b += B + 1) {
        const sr = Math.floor(b / B) * B
        const sc = (b % B) * B
        const nums = Array.from({ length: S }, (_, i) => i + 1)
        shuffle<number>(nums, rng)
        let idx = 0
        for (let r = sr; r < sr + B; r++) {
            for (let c = sc; c < sc + B; c++) {
                grid[r][c] = nums[idx++]
            }
        }
    }
}

/**
 * 回溯填满整盘：先填对角线宫，再逐格搜索
 * · MRV：每次挑候选最少的空格（等于 1 时立刻取用），剪枝效果最好
 * · 候选增量维护：place() 边填边删同行/列/宫候选，回溯时整体回滚 —— 避免每步重算全盘
 * 随机由 rng 注入（core 不许自带随机）；无解时抛错，由调用方兜底成中文提示
 */
export const fillFullBoard = (S: number, B: number, rng: Rng): NumBoard => {
    const grid: NumBoard = makeGrid<number>(S, () => 0)
    fillDiagonal(grid, B, S, rng)

    const tracker = createTracker(S, B, grid)

    const backtrack = (): boolean => {
        const pick = tracker.pickCell()
        if (pick.full) return true
        if (pick.dead) return false

        const list = tracker.candidatesOf(pick.r, pick.c)
        shuffle<number>(list, rng)

        for (const n of list) {
            const undo = tracker.place(pick.r, pick.c, n)
            if (backtrack()) return true
            undo()
        }
        return false
    }

    if (!backtrack()) throw new Error('数独生成失败')
    return grid
}
