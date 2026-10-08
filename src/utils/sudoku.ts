import type { Board, Cell, ConflictMask, NumBoard, Position } from "@/types/game";
import { makeGrid, mapGrid } from "./array";
import { makeCell } from "./board";

/**将数组放入集合验重，判断有无重复*/
const dup = (arr: number[]): boolean => arr.length !== new Set(arr).size

/**从起点到终点这个矩形内获得所有非空值并存储为数组*/
const scan = (grid: NumBoard, [r1, c1]: Position, [r2, c2]: Position): number[] => {
    const vals: number[] = []
    for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
            if (grid[r][c] !== 0) {
                vals.push(grid[r][c])
            }
        }
    }
    return vals
}

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
    const S = boxSize * boxSize

    const scanRow = (grid: NumBoard, r: number): number[] => scan(grid, [r, 0], [r, S - 1])
    const scanCol = (grid: NumBoard, c: number): number[] => scan(grid, [0, c], [S - 1, c])
    const scanBox = (grid: NumBoard, [r, c]: Position): number[] => {
        const sr = Math.floor(r / B) * B
        const sc = Math.floor(c / B) * B
        return scan(grid, [sr, sc], [sr + B - 1, sc + B - 1])
    }

    const rowDup = (grid: NumBoard, r: number): boolean => dup(scanRow(grid, r))
    const colDup = (grid: NumBoard, c: number): boolean => dup(scanCol(grid, c))
    const boxDup = (grid: NumBoard, pos: Position): boolean => dup(scanBox(grid, pos))

    /**检查该格子所在行列宫格，判断该格子能否填入数字n*/
    const canPlace = (grid: NumBoard, pos: Position, n: number): boolean => {
        const [r, c] = pos
        const gridCopy = mapGrid<number,number>(grid,v=>v)
        gridCopy[r][c] = n
        const ok = !rowDup(gridCopy, r) && !colDup(gridCopy, c) && !boxDup(gridCopy, pos)
        return ok
    }

    /**检查该格子所在行列宫格，寻找该格子的可以填入的数字*/
    const candidates = (grid: NumBoard, pos: Position): number[] => {
        const res: number[] = []
        for (let n = 1; n <= S; n++) {
            if (canPlace(grid, pos, n)) {
                res.push(n)
            }
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

    /** 盘面是否存在任何冲突 */
    const hasConflict = (grid: NumBoard): boolean =>
        findConflicts(grid).some(row => row.some(b => b))

    /**检查棋盘有没有填满*/
    const isFull = (grid: NumBoard): boolean =>
        grid.every(row => row.every(v => v !== 0))

    /**检查是否完成，即每个格子都填了且无冲突*/
    const isSolved = (grid: NumBoard): boolean => isFull(grid) && !hasConflict(grid)

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

    /**检验题目是不是答案的子集*/
    const isSubset = (puzzle: NumBoard, solution: NumBoard): boolean =>
        puzzle.every((row, r) =>
            row.every((v, c) => v === 0 || v === solution[r][c])
        )

    /**检验出题的题目和答案*/
    const validatePuzzle = (puzzle: NumBoard, solution: NumBoard): boolean => {
        if (hasConflict(puzzle)) return false
        if(!isSubset(puzzle,solution)) return false
        if (!isSolved(solution)) return false

        return true
    }

    /**生成一个全0的空Board*/
    const emptyBoard = (): Board => makeGrid<Cell>(S, () => makeCell(0, false))

    return {
        S, B,
        canPlace, candidates,
        isSolved, findConflicts,
        validatePuzzle,
        emptyBoard
    }
}

export type Sudoku = ReturnType<typeof createSudoku>


