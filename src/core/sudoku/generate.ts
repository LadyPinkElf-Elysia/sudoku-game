// ============================================================
// core/sudoku/generator.ts
// 生成 / 求解 / 挖洞 一体
// 对外唯一入口：generatePuzzle
// ============================================================

import type { NumBoard } from '../../types/board'
import type { PuzzleData } from '../../types/puzzle'
import type { Rng } from '../../types/rng'
import { makeGrid, shuffle } from '../array'
import { boxIndexAt } from '../board/metrics'
import { getSudoku } from './rules'
import { createTracker } from './tracker'

// ============================================================
// 1. 模式构造 + 随机变换
// ============================================================

/** 模式基础盘：f(r, c) = (r·B + ⌊r/B⌋ + c) mod S + 1 */
const patternBoard = (S: number, B: number): NumBoard => {
    const grid = makeGrid<number>(S, () => 0)
    for (let r = 0; r < S; r++) {
        for (let c = 0; c < S; c++) {
            grid[r][c] = ((r * B + Math.floor(r / B) + c) % S) + 1
        }
    }
    return grid
}

/** 随机变换：数字置换 + 行置换（宫内/宫间）+ 列置换（宫内/宫间）+ 转置 */
const randomTransform = (grid: NumBoard, S: number, B: number, rng: Rng): void => {
    const blocks = S / B

    // 数字置换
    const digits: number[] = []
    for (let n = 1; n <= S; n++) digits.push(n)
    shuffle(digits, rng)
    for (let r = 0; r < S; r++) {
        for (let c = 0; c < S; c++) {
            grid[r][c] = digits[grid[r][c] - 1]
        }
    }

    // 行置换：宫内
    for (let bi = 0; bi < blocks; bi++) {
        const rows: number[] = []
        for (let i = 0; i < B; i++) rows.push(bi * B + i)
        shuffle(rows, rng)
        const copies = rows.map(r => [...grid[r]])
        for (let i = 0; i < B; i++) grid[bi * B + i] = copies[i]
    }

    // 行置换：宫间
    const boxRows: number[] = []
    for (let i = 0; i < blocks; i++) boxRows.push(i)
    shuffle(boxRows, rng)
    const reordered: number[][] = []
    for (const bi of boxRows) {
        for (let i = 0; i < B; i++) reordered.push(grid[bi * B + i])
    }
    for (let r = 0; r < S; r++) grid[r] = reordered[r]

    // 列置换：宫内
    for (let bi = 0; bi < blocks; bi++) {
        const cols: number[] = []
        for (let j = 0; j < B; j++) cols.push(bi * B + j)
        shuffle(cols, rng)
        for (let r = 0; r < S; r++) {
            const copies = cols.map(c => grid[r][c])
            for (let i = 0; i < B; i++) grid[r][bi * B + i] = copies[i]
        }
    }

    // 列置换：宫间
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

    // 转置（可选）
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
// 2. DFS 回溯（用 tracker）
// ============================================================

/** tracker 驱动的 MRV + 回溯；原地修改 grid，成功返回 true */
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

// ============================================================
// 3. 骨架保留比例（动态）
// ============================================================

/**
 * 按盘面边长动态计算骨架保留比例。
 *   9×9   → 0.35
 *   16×16 → 0.42
 *   25×25 → 0.51
 *   36×36 → 0.62
 * 上限 0.65，避免骨架过密导致和模式解过于接近。
 */
const keepRatioOf = (S: number): number =>
    Math.min(0.75, 0.35 + (S - 9) * 0.01)

// ============================================================
// 4. 内部：生成完整解
// ============================================================

/**
 * 模式构造 → 随机变换 → 挖骨架（动态比例）→ 回溯填满
 * 结果不再是纯模式解，而是回溯产物
 */
const buildSolution = (boxSize: number, rng: Rng): NumBoard => {
    const { S, B } = getSudoku(boxSize)
    const total = S * S
    const keepRatio = keepRatioOf(S)

    // 1. 模式盘 + 打乱规律
    const full = patternBoard(S, B)
    randomTransform(full, S, B, rng)

    // 2. 随机挖空得骨架
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

    // 3. 回溯填满
    const ok = dfsFill(S, B, seed, rng, 20_000_000)
    if (!ok) throw new Error('生成失败')
    return seed
}

// ============================================================
// 5. 内部：挖洞
// ============================================================

/**
 * 四约束挖洞：
 *   A 每行/列/宫至少保留 1（硬）
 *   B 每行/列/宫至少挖   1（硬，阶段 1 保底）
 *   D 每行/列的每个宫段至少保留 k（软，阶段 2 优先满足）
 *   实际挖空比例夹到 [40%, 65%]
 */
const digHoles = (solution: NumBoard, blanks: number, rng: Rng): NumBoard => {
    const S = solution.length
    const B = Math.round(Math.sqrt(S))
    const total = S * S
    const puzzle = solution.map(row => [...row])

    // 夹到 [40%, 65%]
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

    // ---- 阶段 1：保底 B（每行/列/宫至少挖 1）----
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

    // ---- 阶段 2：主挖（A + D）----
    for (let i = 0; i < total && removed < target; i++) {
        const idx = indices[i]
        const r = Math.floor(idx / S)
        const c = idx % S
        if (puzzle[r][c] === 0) continue
        if (!canHard(r, c) || !canSoft(r, c)) continue
        remove(r, c)
        removed++
    }

    // ---- 阶段 3：兜底（只 A，放弃 D）----
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

// ============================================================
// 7. 对外唯一入口 generatePuzzle
// ============================================================

/** 生成：传 boxSize + blanks（要挖多少格） */
export function generatePuzzle(
    boxSize: number,
    blanks: number,
    rng: Rng,
): PuzzleData

/** 求解：传题面 */
export function generatePuzzle(
    board: NumBoard,
    rng: Rng,
): PuzzleData | null

export function generatePuzzle(
    boxSizeOrBoard: number | NumBoard,
    blanksOrRng: number | Rng,
    maybeRng?: Rng,
): PuzzleData | null {
    // ---------- 生成分支 ----------
    if (typeof boxSizeOrBoard === 'number') {
        const boxSize = boxSizeOrBoard
        const blanks = blanksOrRng as number
        const rng = maybeRng as Rng

        const solution = buildSolution(boxSize, rng)
        const puzzle = digHoles(solution, blanks, rng)
        return { puzzle, solution }
    }

    // ---------- 求解分支 ----------
    const board = boxSizeOrBoard
    const rng = blanksOrRng as Rng

    const solution = solveBoard(board, rng)
    if (!solution) return null
    return {
        puzzle: board.map(row => [...row]),
        solution,
    }
}