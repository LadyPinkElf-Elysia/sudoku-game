import type { NumBoard } from "@/types/game";
import type { Sudoku } from "./factory";
import { makeGrid, shuffle } from "../array";
import { toRC } from "./board";
import { getSudoku } from "./cache";
import type { PuzzleData } from "@/types/puzzle";

/** 预先填满对角线上的宫格：这些宫格互不冲突，直接随机填 */
const fillDiagonal = (grid: NumBoard, B: number, S: number): void => {
    // 对角宫格的左上角索引：0, B+1, 2(B+1), ...
    for (let b = 0; b < S; b += B + 1) {
        const sr = Math.floor(b / B) * B
        const sc = (b % B) * B
        const nums = Array.from({ length: S }, (_, i) => i + 1)
        shuffle<number>(nums)

        let idx = 0
        for (let r = sr; r < sr + B; r++) {
            for (let c = sc; c < sc + B; c++) {
                grid[r][c] = nums[idx++]
            }
        }
    }
}

/** 回溯生成完整解 */
const solve=(sudoku:Sudoku):NumBoard=>{
    const S=sudoku.S
    const B=sudoku.B
    const grid:NumBoard=makeGrid<number>(S,()=>0)

    fillDiagonal(grid, B, S)

    /**回溯求解*/
    const backtrack=(idx:number):boolean=>{
        if(idx===S*S) return true

        const [r,c]=toRC(idx,S)
        if(grid[r][c]!==0) return backtrack(idx+1)

        const cands=sudoku.candidates(grid,[r,c])
        shuffle<number>(cands)

        for(const n of cands){
            grid[r][c]=n
            if(backtrack(idx+1)) return true
            grid[r][c]=0
        }
        return false
    }

    if(!backtrack(0)) throw new Error('数独生成失败')
    return grid
}

/** 从完整解挖掉 blanks 个 */
const digHoles = (solution: NumBoard, blanks: number, S: number): NumBoard => {
    const puzzle = solution.map(row => [...row])
    const indices = Array.from({ length: S * S }, (_, i) => i)
    shuffle<number>(indices)

    const toRemove = Math.min(Math.max(blanks, 0), S * S - 1)
    for (let i = 0; i < toRemove; i++) {
        const [r, c] = toRC(indices[i], S)
        puzzle[r][c] = 0
    }
    return puzzle
}

/** 对外唯一入口：主线程和 Worker 都调这个 */
export const solveAndDig = (boxSize: number, blanks: number): PuzzleData => {
    const sudoku = getSudoku(boxSize)
    const solution = solve(sudoku)
    const puzzle = digHoles(solution, blanks, sudoku.S)
    return { puzzle, solution }
}