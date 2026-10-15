import type { NumBoard, Position, ConflictMask, Board, Cell } from "../../types/board";
import { makeGrid } from "../array";
import { boxOriginOf } from "../board/metrics";
import { makeCell } from "../board/model";
import { createGroupScanner } from "./groups";
import { sideOf } from "./shape";
import type { Sudoku } from "../../types/sudoku";

/**Sudoku工厂函数*/
export const createSudoku = (boxSize: number): Sudoku => {
    const B = boxSize
    const S = sideOf(B)

    /** 行 / 列 / 宫 的组单元表 + 三个扫描（表随本实例建一次、扫描零小对象分配；见 groups.ts） */
    const { findConflicts, hasConflict, hasEmptyGroup } = createGroupScanner(S, B)

    /**检查该格子所在行列宫格，寻找该格子的可以填入的数字*/
    const getCandidates = (grid: NumBoard, [r, c]: Position): number[] => {
        if (grid[r][c] !== 0) return []

        // 用一个标记数组记录哪些数字已用（比 Set 快，零哈希开销）
        const used = new Array(S + 1).fill(false)

        // 行 + 列：一次循环搞定
        for (let i = 0; i < S; i++) {
            if (grid[r][i] !== 0) used[grid[r][i]] = true
            if (grid[i][c] !== 0) used[grid[i][c]] = true
        }
        // 宫（宫起点来自 core/board/metrics，避免各处重算）
        const [sr, sc] = boxOriginOf(r, c, B)
        for (let i = sr; i < sr + B; i++) {
            for (let j = sc; j < sc + B; j++) {
                if (grid[i][j] !== 0) used[grid[i][j]] = true
            }
        }

        // 挑没被标记的数字
        const res: number[] = []
        for (let n = 1; n <= S; n++) {
            if (!used[n]) res.push(n)
        }
        return res
    }

    /**生成一个全0的空Board*/
    const makeEmptyBoard = (): Board => makeGrid<Cell>(S, () => makeCell(0, false))

    const makeEmptyMask = (): ConflictMask => makeGrid<boolean>(S, () => false)

    /**检查棋盘有没有填满*/
    const isFull = (grid: NumBoard): boolean => grid.every(row => row.every(v => v !== 0))

    /**检查是否完成，即每个格子都填了且无冲突*/
    const isSolved = (grid: NumBoard): boolean => isFull(grid) && !hasConflict(grid)

    /**检验题目是不是答案的子集*/
    const isSubset = (puzzle: NumBoard, solution: NumBoard): boolean =>
        puzzle.every((row, r) =>
            row.every((v, c) => v === 0 || v === solution[r][c])
        )

    /** 两个盘面是否同形（行列都相同）—— 防 validatePuzzle 对不规则输入取越界下标 */
    const sameShape = (a: NumBoard, b: NumBoard): boolean =>
        a.length === b.length && a.every((row, r) => row.length === b[r].length)

    /**检验出题的题目和答案*/
    const validatePuzzle = (puzzle: NumBoard, solution: NumBoard): boolean => {
        if (!sameShape(puzzle, solution)) return false
        if (hasConflict(puzzle)) return false
        if (!isSubset(puzzle, solution)) return false
        if (!isSolved(solution)) return false
        return true
    }

    return {
        S, B,
        getCandidates,
        isSolved, findConflicts, hasConflict,
        hasEmptyGroup,
        validatePuzzle,
        makeEmptyBoard, makeEmptyMask
    }
}

/** 按 boxSize 缓存的 Sudoku 实例 */
const cache = new Map<number, Sudoku>()

export const getSudoku = (boxSize: number): Sudoku => {
    const cached = cache.get(boxSize)
    if (cached) return cached

    const created = createSudoku(boxSize)
    cache.set(boxSize, created)
    return created
}
