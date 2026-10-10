import type { PuzzleData } from "@/types/puzzle";
import type { NumBoard } from "@/types/board";
import { toRC } from "../board/model";
import { getSudoku } from "./rules";
import type { Rng } from "@/types/rng";
import { shuffle, makeGrid } from "../array";
import type { Sudoku } from "@/types/sudoku";

/** 预先填满对角线上的宫格 */
const fillDiagonal = (grid: NumBoard, B: number, S: number,rng:Rng): void => {
    for (let b = 0; b < S; b += B + 1) {
        const sr = Math.floor(b / B) * B
        const sc = (b % B) * B
        const nums = Array.from({ length: S }, (_, i) => i + 1)
        shuffle<number>(nums,rng)
        let idx = 0
        for (let r = sr; r < sr + B; r++) {
            for (let c = sc; c < sc + B; c++) {
                grid[r][c] = nums[idx++]
            }
        }
    }
}

/** 一条落子记录：哪个格子的哪个候选被删了 */
interface Change {
    r: number
    c: number
    n: number
}

/** 回溯生成完整解（MRV + 增量候选维护） */
const solve = (sudoku: Sudoku,rng:Rng): NumBoard => {
    const S = sudoku.S
    const B = sudoku.B
    const grid: NumBoard = makeGrid<number>(S, () => 0)

    fillDiagonal(grid, B, S,rng)

    // 已用数字：rowUsed[r][n]=true 表示第 r 行已用 n
    const rowUsed: boolean[][] = Array.from({ length: S }, () => new Array(S + 1).fill(false))
    const colUsed: boolean[][] = Array.from({ length: S }, () => new Array(S + 1).fill(false))
    const boxUsed: boolean[][] = Array.from({ length: S }, () => new Array(S + 1).fill(false))

    // 候选：cand[r][c][n]=true 表示 (r,c) 可填 n
    const cand: boolean[][][] = Array.from({ length: S }, () =>
        Array.from({ length: S }, () => new Array(S + 1).fill(false))
    )
    // 候选个数，供 MRV 快速比较
    const count: number[][] = Array.from({ length: S }, () => new Array(S).fill(0))

    const boxIdx = (r: number, c: number): number =>
        Math.floor(r / B) * B + Math.floor(c / B)

    // ---------- 初始化 ----------
    for (let r = 0; r < S; r++) {
        for (let c = 0; c < S; c++) {
            const v = grid[r][c]
            if (v !== 0) {
                rowUsed[r][v] = true
                colUsed[c][v] = true
                boxUsed[boxIdx(r, c)][v] = true
            }
        }
    }
    for (let r = 0; r < S; r++) {
        for (let c = 0; c < S; c++) {
            if (grid[r][c] !== 0) continue
            const b = boxIdx(r, c)
            let cnt = 0
            for (let n = 1; n <= S; n++) {
                if (!rowUsed[r][n] && !colUsed[c][n] && !boxUsed[b][n]) {
                    cand[r][c][n] = true
                    cnt++
                }
            }
            count[r][c] = cnt
        }
    }

    // ---------- 落子 / 撤销 ----------
    const place = (r: number, c: number, n: number): Change[] => {
        const changes: Change[] = []
        grid[r][c] = n
        const b = boxIdx(r, c)
        rowUsed[r][n] = true
        colUsed[c][n] = true
        boxUsed[b][n] = true

        // 同行空格去掉候选 n
        for (let i = 0; i < S; i++) {
            if (i !== c && grid[r][i] === 0 && cand[r][i][n]) {
                cand[r][i][n] = false
                count[r][i]--
                changes.push({ r, c: i, n })
            }
        }
        // 同列空格
        for (let i = 0; i < S; i++) {
            if (i !== r && grid[i][c] === 0 && cand[i][c][n]) {
                cand[i][c][n] = false
                count[i][c]--
                changes.push({ r: i, c, n })
            }
        }
        // 同宫空格
        const sr = Math.floor(r / B) * B
        const sc = Math.floor(c / B) * B
        for (let i = sr; i < sr + B; i++) {
            for (let j = sc; j < sc + B; j++) {
                if (i === r && j === c) continue
                if (grid[i][j] === 0 && cand[i][j][n]) {
                    cand[i][j][n] = false
                    count[i][j]--
                    changes.push({ r: i, c: j, n })
                }
            }
        }
        return changes
    }

    const unplace = (r: number, c: number, n: number, changes: Change[]): void => {
        for (const ch of changes) {
            cand[ch.r][ch.c][ch.n] = true
            count[ch.r][ch.c]++
        }
        const b = boxIdx(r, c)
        rowUsed[r][n] = false
        colUsed[c][n] = false
        boxUsed[b][n] = false
        grid[r][c] = 0
    }

    // ---------- 回溯 ----------
    const backtrack = (): boolean => {
        // MRV：扫 count 找候选最少的空格
        let minCount = S + 1
        let bestR = -1
        let bestC = -1

        for (let r = 0; r < S; r++) {
            for (let c = 0; c < S; c++) {
                if (grid[r][c] !== 0) continue
                const cnt = count[r][c]
                if (cnt === 0) return false     // 死路
                if (cnt < minCount) {
                    minCount = cnt
                    bestR = r
                    bestC = c
                    if (cnt === 1) break
                }
            }
            if (minCount === 1) break
        }

        if (bestR === -1) return true     // 全填满

        // 收集候选 + 洗牌
        const candList: number[] = []
        for (let n = 1; n <= S; n++) {
            if (cand[bestR][bestC][n]) candList.push(n)
        }
        shuffle(candList,rng)

        for (const n of candList) {
            const changes = place(bestR, bestC, n)
            if (backtrack()) return true
            unplace(bestR, bestC, n, changes)
        }
        return false
    }

    if (!backtrack()) throw new Error('数独生成失败')
    return grid
}

/** 从完整解挖掉 blanks 个 */
const digHoles = (solution: NumBoard, blanks: number,rng:Rng): NumBoard => {
    const puzzle = solution.map(row => [...row])
    const S=solution.length
    const indices = Array.from({ length: S * S }, (_, i) => i)
    shuffle<number>(indices,rng)

    const toRemove = Math.min(Math.max(blanks, 0), S * S - 1)
    for (let i = 0; i < toRemove; i++) {
        const [r, c] = toRC(indices[i], S)
        puzzle[r][c] = 0
    }
    return puzzle
}

/** 对外唯一入口 */
export const generatePuzzle = (boxSize: number, blanks: number,rng:Rng): PuzzleData => {
    const sudoku = getSudoku(boxSize)
    const solution = solve(sudoku,rng)
    const puzzle = digHoles(solution, blanks,rng)
    return { puzzle, solution }
}