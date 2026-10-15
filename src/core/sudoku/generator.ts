// ============================================================
// core/sudoku/generator.ts
// 生成器：产出一道完整的合法终盘，并负责「出题」这一步的编排
//   对外：generateSolution(boxSize, rng)      —— 只要完整解
//         generatePuzzle(boxSize, blanks, rng) —— 完整解 + 挖空 = 一道题
//   内部：模式盘 → 随机变换 → 随机保留一部分 → 交给求解器补全
// ============================================================

import type { NumBoard } from '../../types/board'
import type { PuzzleData } from '../../types/puzzle'
import type { Rng } from '../../types/rng'
import { makeGrid, shuffle } from '../array'
import { digPuzzle } from './digger'
import { getSudoku } from './rules'
import { solveGrid } from './solver'

// ============================================================
// 1. 模式构造 + 随机变换
// ============================================================

const patternBoard = (S: number, B: number): NumBoard => {
    const grid = makeGrid<number>(S, () => 0)
    for (let r = 0; r < S; r++) {
        for (let c = 0; c < S; c++) {
            grid[r][c] = ((r * B + Math.floor(r / B) + c) % S) + 1
        }
    }
    return grid
}

const randomTransform = (grid: NumBoard, S: number, B: number, rng: Rng): void => {
    const blocks = S / B

    const digits: number[] = []
    for (let n = 1; n <= S; n++) digits.push(n)
    shuffle(digits, rng)
    for (let r = 0; r < S; r++) {
        for (let c = 0; c < S; c++) {
            grid[r][c] = digits[grid[r][c] - 1]
        }
    }

    for (let bi = 0; bi < blocks; bi++) {
        const rows: number[] = []
        for (let i = 0; i < B; i++) rows.push(bi * B + i)
        shuffle(rows, rng)
        const copies = rows.map(r => [...grid[r]])
        for (let i = 0; i < B; i++) grid[bi * B + i] = copies[i]
    }

    const boxRows: number[] = []
    for (let i = 0; i < blocks; i++) boxRows.push(i)
    shuffle(boxRows, rng)
    const reordered: number[][] = []
    for (const bi of boxRows) {
        for (let i = 0; i < B; i++) reordered.push(grid[bi * B + i])
    }
    for (let r = 0; r < S; r++) grid[r] = reordered[r]

    for (let bi = 0; bi < blocks; bi++) {
        const cols: number[] = []
        for (let j = 0; j < B; j++) cols.push(bi * B + j)
        shuffle(cols, rng)
        for (let r = 0; r < S; r++) {
            const copies = cols.map(c => grid[r][c])
            for (let i = 0; i < B; i++) grid[r][bi * B + i] = copies[i]
        }
    }

    const boxCols: number[] = []
    for (let i = 0; i < blocks; i++) boxCols.push(i)
    shuffle(boxCols, rng)
    const colOrder: number[] = []
    for (const bi of boxCols) {
        for (let j = 0; j < B; j++) colOrder.push(bi * B + j)
    }
    for (let r = 0; r < S; r++) {
        const oldRow = grid[r]
        const newRow = new Array<number>(S)
        for (let c = 0; c < S; c++) newRow[c] = oldRow[colOrder[c]]
        grid[r] = newRow
    }

    if (rng() < 0.5) {
        for (let r = 0; r < S; r++) {
            for (let c = r + 1; c < S; c++) {
                const t = grid[r][c]
                grid[r][c] = grid[c][r]
                grid[c][r] = t
            }
        }
    }
}

// ============================================================
// 2. 骨架保留比例（盘面越大保留越多，补全才是「秒收」而不是「长考」）
//    小盘按曲线（B=3 → 0.35 起）；S ≥ 64（B=8/9/10）统一 0.85 —— 大盘不留"长考"的机会
// ============================================================

const keepRatioOf = (S: number): number => {
    if (S >= 64) return 0.85
    return Math.min(0.72, 0.35 + (S - 9) * 0.014)
}

// ============================================================
// 3. 对外入口
// ============================================================

/** 生成一盘完整解：模式盘 + 随机变换 + 随机挖掉一部分 → 回溯补全；失败（超迭代）抛错 */
export const generateSolution = (boxSize: number, rng: Rng): NumBoard => {
    const { S, B } = getSudoku(boxSize)
    const total = S * S
    const keepRatio = keepRatioOf(S)

    const full = patternBoard(S, B)
    randomTransform(full, S, B, rng)

    const indices: number[] = []
    for (let i = 0; i < total; i++) indices.push(i)
    shuffle(indices, rng)
    const keepCount = Math.floor(total * keepRatio)
    const keep = new Uint8Array(total)
    for (let i = 0; i < keepCount; i++) keep[indices[i]] = 1

    const seed: NumBoard = makeGrid<number>(S, () => 0)
    for (let r = 0; r < S; r++) {
        for (let c = 0; c < S; c++) {
            if (keep[r * S + c]) seed[r][c] = full[r][c]
        }
    }

    const solved: NumBoard[] = []
    solveGrid(seed, boxSize, rng, board => {
        solved.push(board)
        return true
    })
    if (!solved.length) throw new Error('生成失败')
    return solved[0]
}

/** 生成一题：生成器出完整解 → 挖空器挖出题面（Worker 走这个入口） */
export const generatePuzzle = (boxSize: number, blanks: number, rng: Rng): PuzzleData => {
    const solution = generateSolution(boxSize, rng)
    return { puzzle: digPuzzle(solution, blanks, rng), solution }
}
