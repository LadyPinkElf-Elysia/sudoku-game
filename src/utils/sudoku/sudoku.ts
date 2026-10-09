import type { NumBoard, Position, ConflictMask, Board, Cell } from "@/types/board";
import { makeGrid } from "../grid";
import { makeCell } from "./transform";
import { sideOf } from "./shape";

/**检查一组格子中有无冲突*/
const findGroupConflicts = (grid: NumBoard, cells: Position[]): Position[] => {
    const map = new Map<number, Position[]>()
    for (const [r, c] of cells) {
        const v = grid[r][c]
        if (v === 0) {
            continue
        }
        if (!map.has(v)) {
            map.set(v, [])
        }
        map.get(v)!.push([r, c])
    }
    const conflicts: Position[] = []
    for (const ps of map.values()) {
        if (ps.length > 1) {
            conflicts.push(...ps)
        }
    }
    return conflicts
}

/**Sudoku工厂函数*/
export const createSudoku = (boxSize: number) => {
    const B = boxSize
    const S = sideOf(B)

    function* allRows(): Generator<Position[]> {
        for (let r = 0; r < S; r++) {
            const cells: Position[] = []
            for (let c = 0; c < S; c++) cells.push([r, c])
            yield cells
        }
    }

    function* allCols(): Generator<Position[]> {
        for (let c = 0; c < S; c++) {
            const cells: Position[] = []
            for (let r = 0; r < S; r++) cells.push([r, c])
            yield cells
        }
    }

    function* allBoxes(): Generator<Position[]> {
        for (let br = 0; br < S; br += B) {
            for (let bc = 0; bc < S; bc += B) {
                const cells: Position[] = []
                for (let i = 0; i < B; i++)
                    for (let j = 0; j < B; j++)
                        cells.push([br + i, bc + j])
                yield cells
            }
        }
    }

    /**生成行，列，宫格等位置组*/
    function* allGroups(): Generator<Position[]> {
        yield* allRows()
        yield* allCols()
        yield* allBoxes()
    }

    /**检查该格子所在行列宫格，寻找该格子的可以填入的数字*/
    const candidates = (grid: NumBoard, [r, c]: Position): number[] => {
        if (grid[r][c] !== 0) return []

        // 用一个标记数组记录哪些数字已用（比 Set 快，零哈希开销）
        const used = new Array(S + 1).fill(false)

        // 行 + 列：一次循环搞定
        for (let i = 0; i < S; i++) {
            if (grid[r][i] !== 0) used[grid[r][i]] = true
            if (grid[i][c] !== 0) used[grid[i][c]] = true
        }
        // 宫
        const sr = Math.floor(r / B) * B
        const sc = Math.floor(c / B) * B
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

    /**找出所有冲突格*/
    const findConflicts = (grid: NumBoard): ConflictMask => {
        const mask: ConflictMask = makeGrid(S, () => false)
        for (const group of allGroups()) {
            for (const [r, c] of findGroupConflicts(grid, group)) {
                mask[r][c] = true
            }
        }
        return mask
    }

    /** 盘面是否存在任何冲突（发现即返回，不构造整张掩码） */
    const hasConflict = (grid: NumBoard): boolean => {
        for (const group of allGroups()) {
            if (findGroupConflicts(grid, group).length) return true
        }
        return false
    }


    /**检查棋盘有没有填满*/
    const isFull = (grid: NumBoard): boolean => grid.every(row => row.every(v => v !== 0))

    /**检查是否完成，即每个格子都填了且无冲突*/
    const isSolved = (grid: NumBoard): boolean => isFull(grid) && !hasConflict(grid)

    /**检验题目是不是答案的子集*/
    const isSubset = (puzzle: NumBoard, solution: NumBoard): boolean =>
        puzzle.every((row, r) =>
            row.every((v, c) => v === 0 || v === solution[r][c])
        )

    /**检验出题的题目和答案*/
    const validatePuzzle = (puzzle: NumBoard, solution: NumBoard): boolean => {
        if (hasConflict(puzzle)) return false
        if (!isSubset(puzzle, solution)) return false
        if (!isSolved(solution)) return false
        return true
    }

    /**生成一个全0的空Board*/
    const emptyBoard = (): Board => makeGrid<Cell>(S, () => makeCell(0, false))

    return {
        S, B,
        candidates,
        isSolved, findConflicts,
        validatePuzzle,
        emptyBoard
    }
}

export type Sudoku = ReturnType<typeof createSudoku>


