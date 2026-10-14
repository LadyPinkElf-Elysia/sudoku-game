// ============================================================
// core/sudoku/digger.ts
// 挖空器：拿一盘的完整解 → 挖出题面
//   对外：digPuzzle(solution, blanks, rng)
//   三阶段（都想挖到 target，越往后越保守）：
//     ① 先保证「每行 / 每列 / 每宫至少留 1 个数」，逐格挖
//     ② 软约束：行-宫 / 列-宫 交叉处还要留够 k 个数（题面才不至于过于空）
//     ③ 兜底：只守「行/列/宫各留 1 个」的硬底线，尽量凑够 target
// ============================================================

import type { NumBoard } from '../../types/board'
import type { Rng } from '../../types/rng'
import { BLANK_RATIO } from '../../constants/game'
import { shuffle } from '../array'
import { boxIndexAt } from '../board/metrics'
import { boxSizeOf } from './shape'

/** 挖空：solution 原样不动，返回一份新题面；blanks 会被收敛到 40%~65% 的允许区间 */
export const digPuzzle = (solution: NumBoard, blanks: number, rng: Rng): NumBoard => {
    const S = solution.length
    const puzzle = solution.map(row => [...row])
    const boxSize = boxSizeOf(S)
    if (boxSize === null) return puzzle

    const B = boxSize
    const total = S * S

    const minBlanks = Math.ceil(total * BLANK_RATIO.min)
    const maxBlanks = Math.floor(total * BLANK_RATIO.max)
    const target = Math.max(minBlanks, Math.min(blanks, maxBlanks))

    const k = Math.max(1, Math.round(B * 0.35))

    const rowKeep = new Array<number>(S).fill(S)
    const colKeep = new Array<number>(S).fill(S)
    const boxKeep = new Array<number>(S).fill(S)
    const rowBoxKeep: number[][] = Array.from({ length: S }, () => new Array<number>(B).fill(B))
    const colBoxKeep: number[][] = Array.from({ length: B }, () => new Array<number>(S).fill(B))

    const remove = (r: number, c: number): void => {
        puzzle[r][c] = 0
        rowKeep[r]--
        colKeep[c]--
        boxKeep[boxIndexAt(r, c, B)]--
        rowBoxKeep[r][Math.floor(c / B)]--
        colBoxKeep[Math.floor(r / B)][c]--
    }

    const canHard = (r: number, c: number): boolean =>
        rowKeep[r] > 1 &&
        colKeep[c] > 1 &&
        boxKeep[boxIndexAt(r, c, B)] > 1

    const canSoft = (r: number, c: number): boolean => {
        const bc = Math.floor(c / B)
        const br = Math.floor(r / B)
        return rowBoxKeep[r][bc] > k && colBoxKeep[br][c] > k
    }

    const indices: number[] = []
    for (let i = 0; i < total; i++) indices.push(i)
    shuffle(indices, rng)

    let removed = 0

    const rowDug = new Uint8Array(S)
    const colDug = new Uint8Array(S)
    const boxDug = new Uint8Array(S)
    let rowsLeft = S
    let colsLeft = S
    let boxesLeft = S

    // 阶段①：每个行 / 列 / 宫都至少挖掉一格（轮到的格子还必须是硬约束允许的）
    for (let i = 0; i < total && removed < target; i++) {
        if (rowsLeft === 0 && colsLeft === 0 && boxesLeft === 0) break
        const idx = indices[i]
        const r = Math.floor(idx / S)
        const c = idx % S
        const b = boxIndexAt(r, c, B)
        if (rowDug[r] && colDug[c] && boxDug[b]) continue
        if (!canHard(r, c)) continue

        remove(r, c)
        removed++
        if (!rowDug[r]) { rowDug[r] = 1; rowsLeft-- }
        if (!colDug[c]) { colDug[c] = 1; colsLeft-- }
        if (!boxDug[b]) { boxDug[b] = 1; boxesLeft-- }
    }

    // 阶段②：硬 + 软约束一起守，继续凑 target
    for (let i = 0; i < total && removed < target; i++) {
        const idx = indices[i]
        const r = Math.floor(idx / S)
        const c = idx % S
        if (puzzle[r][c] === 0) continue
        if (!canHard(r, c) || !canSoft(r, c)) continue
        remove(r, c)
        removed++
    }

    // 阶段③：只要硬底线还在就挖（保证不会出现空行 / 空列 / 空宫）
    for (let i = 0; i < total && removed < target; i++) {
        const idx = indices[i]
        const r = Math.floor(idx / S)
        const c = idx % S
        if (puzzle[r][c] === 0) continue
        if (!canHard(r, c)) continue
        remove(r, c)
        removed++
    }

    return puzzle
}
