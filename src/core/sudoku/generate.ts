// ============================================================
// core/sudoku/generator.ts
// 生成 / 求解 / 多解 / 挖洞 一体
// 对外入口：
//   generatePuzzle(boxSize, blanks, rng)  生成
//   generatePuzzle(board, rng)            单解
//   solvePuzzleMulti(board, rng, max)     多解
// ============================================================

import type { NumBoard } from '../../types/board'
import type { PuzzleData } from '../../types/puzzle'
import type { Rng } from '../../types/rng'
import { makeGrid, shuffle } from '../array'
import { boxIndexAt } from '../board/metrics'
import { getSudoku } from './rules'
import { createTracker } from './tracker'

// ============================================================
// 0. 类型
// ============================================================

/** 多解结果 */
export interface MultiSolveResult {
    puzzle: NumBoard
    /** 第一个解（= solutions[0]），便于调用方直接取 */
    solution: NumBoard
    /** 所有找到的解，长度 ≤ maxSolutions */
    solutions: NumBoard[]
}

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
// 2. DFS 回溯（单解 / 多解）
// ============================================================

/** 单解：找到即停，返回 true */
const dfsFill = (
    S: number,
    B: number,
    grid: NumBoard,
    rng: Rng,
    maxIter: number,
): boolean => {
    const { pickCell, candidatesOf, place } = createTracker(S, B, grid)
    let iter = 0

    const dfs = (): boolean => {
        if (++iter > maxIter) return false

        const { r, c, full, dead } = pickCell()
        if (full) return true
        if (dead) return false

        const list = candidatesOf(r, c)
        shuffle(list, rng)

        for (const n of list) {
            const undo = place(r, c, n)
            if (dfs()) return true
            undo()
        }
        return false
    }

    return dfs()
}

/** 多解：找到解存下继续搜，直到数量达到上限或迭代超限 */
const dfsEnumerate = (
    S: number,
    B: number,
    grid: NumBoard,
    rng: Rng,
    maxSolutions: number,
    maxIter: number,
): NumBoard[] => {
    const { pickCell, candidatesOf, place } = createTracker(S, B, grid)
    const solutions: NumBoard[] = []
    let iter = 0

    const dfs = (): void => {
        if (solutions.length >= maxSolutions) return
        if (++iter > maxIter) return

        const { r, c, full, dead } = pickCell()
        if (dead) return
        if (full) {
            solutions.push(grid.map(row => [...row]))
            return
        }

        const list = candidatesOf(r, c)
        shuffle(list, rng)

        for (const n of list) {
            if (solutions.length >= maxSolutions) return
            const undo = place(r, c, n)
            dfs()
            undo()
        }
    }

    dfs()
    return solutions
}

// ============================================================
// 3. 骨架保留比例
// ============================================================

const keepRatioOf = (S: number): number => {
    if (S >= 100) return 0.85
    return Math.min(0.72, 0.35 + (S - 9) * 0.014)
}

// ============================================================
// 4. 内部：生成完整解
// ============================================================

const buildSolution = (boxSize: number, rng: Rng): NumBoard => {
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

    const ok = dfsFill(S, B, seed, rng, 20_000_000)
    if (!ok) throw new Error('生成失败')
    return seed
}

// ============================================================
// 5. 内部：挖洞
// ============================================================

const digHoles = (solution: NumBoard, blanks: number, rng: Rng): NumBoard => {
    const S = solution.length
    const B = Math.round(Math.sqrt(S))
    const total = S * S
    const puzzle = solution.map(row => [...row])

    const minBlanks = Math.ceil(total * 0.4)
    const maxBlanks = Math.floor(total * 0.65)
    const target = Math.max(minBlanks, Math.min(blanks, maxBlanks))

    const k = Math.max(1, Math.round(B * 0.35))

    const rowKeep = new Array<number>(S).fill(S)
    const colKeep = new Array<number>(S).fill(S)
    const boxKeep = new Array<number>(S).fill(S)
    const rowBoxKeep: number[][] = Array.from({ length: S }, () => new Array<number>(B).fill(B))
    const colBoxKeep: number[][] = Array.from({ length: B }, () => new Array<number>(S).fill(B))

    const remove = (r: number, c: number): void => {
        puzzle[r][c] = 0
        rowKeep[r]--
        colKeep[c]--
        boxKeep[boxIndexAt(r, c, B)]--
        rowBoxKeep[r][Math.floor(c / B)]--
        colBoxKeep[Math.floor(r / B)][c]--
    }

    const canHard = (r: number, c: number): boolean =>
        rowKeep[r] > 1 &&
        colKeep[c] > 1 &&
        boxKeep[boxIndexAt(r, c, B)] > 1

    const canSoft = (r: number, c: number): boolean => {
        const bc = Math.floor(c / B)
        const br = Math.floor(r / B)
        return rowBoxKeep[r][bc] > k && colBoxKeep[br][c] > k
    }

    const indices: number[] = []
    for (let i = 0; i < total; i++) indices.push(i)
    shuffle(indices, rng)

    let removed = 0

    const rowDug = new Uint8Array(S)
    const colDug = new Uint8Array(S)
    const boxDug = new Uint8Array(S)
    let rowsLeft = S
    let colsLeft = S
    let boxesLeft = S

    for (let i = 0; i < total && removed < target; i++) {
        if (rowsLeft === 0 && colsLeft === 0 && boxesLeft === 0) break
        const idx = indices[i]
        const r = Math.floor(idx / S)
        const c = idx % S
        const b = boxIndexAt(r, c, B)
        if (rowDug[r] && colDug[c] && boxDug[b]) continue
        if (!canHard(r, c)) continue

        remove(r, c)
        removed++
        if (!rowDug[r]) { rowDug[r] = 1; rowsLeft-- }
        if (!colDug[c]) { colDug[c] = 1; colsLeft-- }
        if (!boxDug[b]) { boxDug[b] = 1; boxesLeft-- }
    }

    for (let i = 0; i < total && removed < target; i++) {
        const idx = indices[i]
        const r = Math.floor(idx / S)
        const c = idx % S
        if (puzzle[r][c] === 0) continue
        if (!canHard(r, c) || !canSoft(r, c)) continue
        remove(r, c)
        removed++
    }

    for (let i = 0; i < total && removed < target; i++) {
        const idx = indices[i]
        const r = Math.floor(idx / S)
        const c = idx % S
        if (puzzle[r][c] === 0) continue
        if (!canHard(r, c)) continue
        remove(r, c)
        removed++
    }

    return puzzle
}

// ============================================================
// 6. 内部：求解
// ============================================================

const solveBoard = (board: NumBoard, rng: Rng): NumBoard | null => {
    const S = board.length
    const B = Math.round(Math.sqrt(S))
    if (B * B !== S) return null

    const grid = board.map(row => [...row])
    const ok = dfsFill(S, B, grid, rng, 20_000_000)
    return ok ? grid : null
}

const solveBoardMulti = (
    board: NumBoard,
    rng: Rng,
    maxSolutions: number,
    maxIter = 20_000_000,
): NumBoard[] => {
    const S = board.length
    const B = Math.round(Math.sqrt(S))
    if (B * B !== S) return []

    const grid = board.map(row => [...row])
    return dfsEnumerate(S, B, grid, rng, maxSolutions, maxIter)
}

// ============================================================
// 7. 对外入口
// ============================================================

/** 生成：传 boxSize + blanks（要挖多少格） */
export function generatePuzzle(
    boxSize: number,
    blanks: number,
    rng: Rng,
): PuzzleData

/** 求解（单解）：传题面 */
export function generatePuzzle(
    board: NumBoard,
    rng: Rng,
): PuzzleData | null

export function generatePuzzle(
    boxSizeOrBoard: number | NumBoard,
    blanksOrRng: number | Rng,
    maybeRng?: Rng,
): PuzzleData | null {
    if (typeof boxSizeOrBoard === 'number') {
        const boxSize = boxSizeOrBoard
        const blanks = blanksOrRng as number
        const rng = maybeRng as Rng

        const solution = buildSolution(boxSize, rng)
        const puzzle = digHoles(solution, blanks, rng)
        return { puzzle, solution }
    }

    const board = boxSizeOrBoard
    const rng = blanksOrRng as Rng

    const solution = solveBoard(board, rng)
    if (!solution) return null
    return {
        puzzle: board.map(row => [...row]),
        solution,
    }
}

/**
 * 多解枚举：独立入口，和单解完全分开。
 * 最多找 maxSolutions 个解；找不到返回 null。
 */
export function solvePuzzleMulti(
    board: NumBoard,
    rng: Rng,
    maxSolutions: number,
): MultiSolveResult | null {
    const max = Math.max(1, Math.floor(maxSolutions))
    const solutions = solveBoardMulti(board, rng, max)
    if (solutions.length === 0) return null

    return {
        puzzle: board.map(row => [...row]),
        solution: solutions[0],
        solutions,
    }
}