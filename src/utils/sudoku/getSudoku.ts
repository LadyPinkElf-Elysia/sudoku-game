import { createSudoku, type Sudoku } from './sudoku'

const cache = new Map<number, Sudoku>()

/** 按 boxSize 缓存 Sudoku 实例 */
export function getSudoku(boxSize: number): Sudoku {
    const cached = cache.get(boxSize)
    if (cached) return cached

    const created = createSudoku(boxSize)
    cache.set(boxSize, created)
    return created
}