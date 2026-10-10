import type { Board, ConflictMask, NumBoard, Position } from './board'

/**
 * 数独规则引擎契约（由 core/sudoku/rules 的 createSudoku 实现）
 * 放在 types/ 而不是用 ReturnType 推导：让 types 保持叶子层，同时约束实现
 */
export interface Sudoku {
    /** 宫边长 B */
    B: number
    /** 盘面边长 S = B² */
    S: number

    /** 该格可填的数字（已填格返回空数组） */
    getCandidates(grid: NumBoard, pos: Position): number[]

    /** 全 0 的空盘 */
    makeEmptyBoard(): Board
    /** 全 false 的冲突掩码 */
    makeEmptyMask(): ConflictMask

    /** 是否填满且无冲突 */
    isSolved(grid: NumBoard): boolean
    /** 所有冲突格 */
    findConflicts(grid: NumBoard): ConflictMask
    /** 是否存在任何冲突（发现即返回） */
    hasConflict(grid: NumBoard): boolean
    /** 校验「题面 + 答案」是否成立 */
    validatePuzzle(puzzle: NumBoard, solution: NumBoard): boolean
}
