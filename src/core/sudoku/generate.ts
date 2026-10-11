import type { NumBoard } from '../../types/board'
import type { PuzzleData } from '../../types/puzzle'
import type { Rng } from '../../types/rng'
import { shuffle } from '../array'
import { toRC } from '../board/model'
import { fillFullBoard } from './fill'
import { getSudoku } from './rules'

/** 从完整解里挖掉 blanks 个空格（上限 = 格数 - 1，保证题面不全空） */
export const digHoles = (solution: NumBoard, blanks: number, rng: Rng): NumBoard => {
    const puzzle = solution.map(row => [...row])
    const S = solution.length
    const indices = Array.from({ length: S * S }, (_, i) => i)
    shuffle<number>(indices, rng)

    const toRemove = Math.min(Math.max(blanks, 0), S * S - 1)
    for (let i = 0; i < toRemove; i++) {
        const [r, c] = toRC(indices[i], S)
        puzzle[r][c] = 0
    }
    return puzzle
}

/** 对外唯一入口：随机终盘 → 挖洞 → { puzzle, solution } */
export const generatePuzzle = (boxSize: number, blanks: number, rng: Rng): PuzzleData => {
    const { S, B } = getSudoku(boxSize)
    const solution = fillFullBoard(S, B, rng)
    const puzzle = digHoles(solution, blanks, rng)
    return { puzzle, solution }
}
