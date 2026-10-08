// src/utils/generator.ts
import type { NumBoard } from '@/types/game'
import type { PuzzleData } from '@/types/puzzle'
import { getSudoku } from './getSudoku'
import { makeGrid, shuffle } from './array'
import type { Sudoku } from './sudoku'
import { toRC } from './board'

/**生成一个数独，包含题目和答案*/
export const generate = (boxSize: number, blanks = 35): PuzzleData => {
    const sudoku = getSudoku(boxSize)
    const solution = solve(sudoku)
    const puzzle = digHoles(solution, blanks, sudoku.S)

    return { puzzle, solution }
}

/**回溯生成完整解*/
const solve = (sudoku: Sudoku): NumBoard => {
    const S = sudoku.S
    const grid: NumBoard = makeGrid<number>(S, () => 0)

    const backtrack = (pos: number): boolean => {
        if (pos === S * S) return true

        const [r, c] = toRC(pos, S)
        if (grid[r][c] !== 0) return backtrack(pos + 1)

        const cands = sudoku.candidates(grid, [r, c])

        // 打乱候选 —— 保证每次生成的解不同
        shuffle<number>(cands)

        for (const n of cands) {
            grid[r][c] = n
            if (backtrack(pos + 1)) return true
            grid[r][c] = 0
        }
        return false
    }

    if (!backtrack(0)) throw new Error('数独生成失败')
    return grid
}

/**从完整解挖掉前 blanks 个*/
const digHoles = (solution: NumBoard, blanks: number, S: number): NumBoard => {
    const puzzle = solution.map(row => [...row])

    const indices = Array.from({ length: S * S }, (_, i) => i)
    shuffle<number>(indices)

    // 挖空数限制在 0 ~ S²-1，至少留 1 个数字
    const toRemove = Math.min(Math.max(blanks, 0), S * S - 1)
    for (let i = 0; i < toRemove; i++) {
        const idx = indices[i]
        const [r, c] = toRC(idx, S)
        puzzle[r][c] = 0
    }

    return puzzle
}