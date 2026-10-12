import type { NumBoard } from '../../types/board'
import { boxIndexAt, boxOriginOf } from '../board/metrics'

/** 一条落子记录：哪个格子的哪个候选被删了（本文件私有，不外泄） */
interface Change {
    r: number
    c: number
    n: number
}

/**
 * 回溯用「候选簿记器」：维护 行/列/宫 已用数字 + 每格候选与候选个数
 * · 初始化时把 grid 里已有的数字登记进去
 * · place() 直接就地写 grid，并返回**撤销函数**（候选回滚 + 释放已用 + 清空格）
 * 这里只有数据与计数，不含任何规则/随机 —— 候选怎么用由调用方（fill.ts）决定
 */
export const createTracker = (S: number, B: number, grid: NumBoard) => {
    /** rowUsed[r][n] = 第 r 行已用数字 n */
    const rowUsed: boolean[][] = Array.from({ length: S }, () => new Array(S + 1).fill(false))
    const colUsed: boolean[][] = Array.from({ length: S }, () => new Array(S + 1).fill(false))
    const boxUsed: boolean[][] = Array.from({ length: S }, () => new Array(S + 1).fill(false))

    /** cand[r][c][n] = (r,c) 可填 n；count[r][c] = 候选个数（供 MRV 快速比较） */
    const cand: boolean[][][] = Array.from({ length: S }, () =>
        Array.from({ length: S }, () => new Array(S + 1).fill(false)))
    const count: number[][] = Array.from({ length: S }, () => new Array(S).fill(0))

    // ---------- 用现有盘面初始化 ----------
    for (let r = 0; r < S; r++) {
        for (let c = 0; c < S; c++) {
            const v = grid[r][c]
            if (v === 0) continue
            rowUsed[r][v] = true
            colUsed[c][v] = true
            boxUsed[boxIndexAt(r, c, B)][v] = true
        }
    }
    for (let r = 0; r < S; r++) {
        for (let c = 0; c < S; c++) {
            if (grid[r][c] !== 0) continue
            const b = boxIndexAt(r, c, B)
            let left = 0
            for (let n = 1; n <= S; n++) {
                if (!rowUsed[r][n] && !colUsed[c][n] && !boxUsed[b][n]) {
                    cand[r][c][n] = true
                    left++
                }
            }
            count[r][c] = left
        }
    }

    /** MRV：候选最少的空格。full = 已无空格；dead = 出现 0 候选（死路，需回溯） */
    const pickCell = (): { r: number; c: number; full: boolean; dead: boolean } => {
        let minCount = S + 1
        let bestR = -1
        let bestC = -1

        for (let r = 0; r < S; r++) {
            for (let c = 0; c < S; c++) {
                if (grid[r][c] !== 0) continue
                const cnt = count[r][c]
                if (cnt === 0) return { r: -1, c: -1, full: false, dead: true }
                if (cnt < minCount) {
                    minCount = cnt
                    bestR = r
                    bestC = c
                    if (cnt === 1) break
                }
            }
            if (minCount === 1) break
        }

        if (bestR === -1) return { r: -1, c: -1, full: true, dead: false }
        return { r: bestR, c: bestC, full: false, dead: false }
    }

    /** 该格当前可填数字（未洗牌） */
    const candidatesOf = (r: number, c: number): number[] => {
        const list: number[] = []
        for (let n = 1; n <= S; n++) if (cand[r][c][n]) list.push(n)
        return list
    }

    /** 落子：写 grid + 删掉同行/列/宫空格里的该候选；返回撤销函数 */
    const place = (r: number, c: number, n: number): (() => void) => {
        const changes: Change[] = []
        const b = boxIndexAt(r, c, B)
        grid[r][c] = n
        rowUsed[r][n] = true
        colUsed[c][n] = true
        boxUsed[b][n] = true

        /** 空格 (i,j) 去掉候选 n（改候选 + 记账，撤销时按 changes 回滚） */
        const drop = (i: number, j: number): void => {
            if (grid[i][j] !== 0 || !cand[i][j][n]) return
            cand[i][j][n] = false
            count[i][j]--
            changes.push({ r: i, c: j, n })
        }

        for (let i = 0; i < S; i++) {
            if (i !== c) drop(r, i)      // 同行空格
            if (i !== r) drop(i, c)      // 同列空格
        }
        // 同宫空格（宫起点来自 core/board/metrics）
        const [sr, sc] = boxOriginOf(r, c, B)
        for (let i = sr; i < sr + B; i++) {
            for (let j = sc; j < sc + B; j++) {
                if (i !== r || j !== c) drop(i, j)
            }
        }

        return () => {
            for (const ch of changes) {
                cand[ch.r][ch.c][ch.n] = true
                count[ch.r][ch.c]++
            }
            rowUsed[r][n] = false
            colUsed[c][n] = false
            boxUsed[b][n] = false
            grid[r][c] = 0
        }
    }

    return { pickCell, candidatesOf, place }
}
