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
    /** 是否有整行 / 整列 / 整宫全为 0（自定义 / 出题提交题面时校验；系统生成不校验） */
    hasEmptyGroup(grid: NumBoard): boolean
    /** 校验「题面 + 答案」是否成立 */
    validatePuzzle(puzzle: NumBoard, solution: NumBoard): boolean
}

/**
 * 「组」单元表（由 core/sudoku/groups 的 createGroupTable 建一次，随 Sudoku 实例缓存）
 * 3S 个组：前 S 个是行、接着 S 个是列、最后 S 个是宫；每组存**扁平下标**（r*S+c）
 */
export interface GroupTable {
    /** 组的格子（扁平下标列表） */
    cells: Int32Array[]
    /** 每格所属的三个组编号：行 = r、列 = S + c、宫 = 2S + boxIndexAt */
    row: Int32Array
    col: Int32Array
    box: Int32Array
}

/** 三个"查冲突"扫描（由 core/sudoku/groups 的 createGroupScanner 实现；共用计数缓冲） */
export interface GroupScanner {
    /** 所有冲突格（每次返回**新掩码**：store 的 computed 靠它通知下游） */
    findConflicts(grid: NumBoard): ConflictMask
    /** 是否存在任何冲突（发现即返回，不构造掩码） */
    hasConflict(grid: NumBoard): boolean
    /** 是否有整行 / 整列 / 整宫全为 0（缺失行按"非空"处理） */
    hasEmptyGroup(grid: NumBoard): boolean
}
