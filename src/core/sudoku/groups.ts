import { makeGrid } from "../array"
import { boxIndexAt } from "../board/metrics"
import type { ConflictMask, NumBoard } from "../../types/board"
import type { GroupScanner, GroupTable } from "../../types/sudoku"

/**
 * 「组」= 行 / 列 / 宫 的统一表示（组单元表）+ 基于它的三个扫描
 *   · 表随 Sudoku 实例建一次，扫描时**零小对象分配**
 *   · 三个扫描共用"值计数"缓冲 —— 单线程、非递归，实例内安全
 *   · 契约（`GroupTable` / `GroupScanner`）在 `types/sudoku.ts`，这里只放实现
 *
 * 为什么不用 `Position[]`：盘面最大 100×100，一次整盘扫描要遍历 3S = 300 个组 × 100 格；
 * 若每组现造 `[r,c]` 数组，一次调用就要造约 3 万个小对象（GC 压力、每格都是新数组）。
 * 这里改成"扁平下标 + 复用缓冲"：一次调用只剩最后那张掩码需要新建。
 */

/** 建组单元表（随 Sudoku 实例建一次） */
export const createGroupTable = (S: number, B: number): GroupTable => {
    const cells: Int32Array[] = []

    for (let r = 0; r < S; r++) {
        const g = new Int32Array(S)
        for (let c = 0; c < S; c++) g[c] = r * S + c
        cells.push(g)
    }

    for (let c = 0; c < S; c++) {
        const g = new Int32Array(S)
        for (let r = 0; r < S; r++) g[r] = r * S + c
        cells.push(g)
    }

    for (let br = 0; br < S; br += B) {
        for (let bc = 0; bc < S; bc += B) {
            const g = new Int32Array(B * B)
            let k = 0
            for (let i = 0; i < B; i++)
                for (let j = 0; j < B; j++) g[k++] = (br + i) * S + (bc + j)
            cells.push(g)
        }
    }

    const total = S * S
    const row = new Int32Array(total)
    const col = new Int32Array(total)
    const box = new Int32Array(total)
    for (let r = 0; r < S; r++) {
        for (let c = 0; c < S; c++) {
            const i = r * S + c
            row[i] = r
            col[i] = S + c
            box[i] = 2 * S + boxIndexAt(r, c, B)
        }
    }

    return { cells, row, col, box }
}

export const createGroupScanner = (S: number, B: number): GroupScanner => {
    const table: GroupTable = createGroupTable(S, B)

    const counts = new Int32Array(S + 1)   // counts[v] = 值 v 在本组出现几次（用到 1..S）
    const touched = new Int32Array(S + 1)  // 本组出现过的值 → 复位只需 O(出现数)，不必清整表
    const dups = new Int32Array(S + 1)     // 本组"出现 ≥2 次"的值
    const dup = new Uint8Array(S + 1)      // 临时标记（仅 findConflicts 的回写段用）

    /** ① 数一遍本组：写 counts，并把出现过的值记进 touched；返回动过几个值 */
    const tally = (grid: NumBoard, g: Int32Array): number => {
        let n = 0
        for (let i = 0; i < g.length; i++) {
            const p = g[i]
            const v = grid[(p / S) | 0][p % S]
            if (v === 0) continue
            if (counts[v] === 0) touched[n++] = v
            counts[v]++
        }
        return n
    }

    /** ② 复位 counts（顺带挑出"出现 ≥2 次"的值写进 dups）；返回重复值的个数 */
    const settle = (n: number): number => {
        let dn = 0
        for (let i = 0; i < n; i++) {
            const v = touched[i]
            if (counts[v] > 1) dups[dn++] = v
            counts[v] = 0
        }
        return dn
    }

    /** 所有冲突格：同组里"自己的值出现过 ≥2 次"的格子（空格的 v=0 → dup[0] 恒 0，自动跳过） */
    const findConflicts = (grid: NumBoard): ConflictMask => {
        const mask = makeGrid<boolean>(S, () => false)
        for (const g of table.cells) {
            const dn = settle(tally(grid, g))
            if (!dn) continue
            for (let i = 0; i < dn; i++) dup[dups[i]] = 1

            for (let i = 0; i < g.length; i++) {
                const p = g[i]
                if (dup[grid[(p / S) | 0][p % S]]) mask[(p / S) | 0][p % S] = true
            }

            for (let i = 0; i < dn; i++) dup[dups[i]] = 0   // 清干净，下一组复用
        }
        return mask
    }

    /** 是否存在任何冲突（每组发现重复就立刻返回） */
    const hasConflict = (grid: NumBoard): boolean => {
        for (const g of table.cells) {
            const n = tally(grid, g)
            let has = false
            for (let i = 0; i < n; i++) {
                const v = touched[i]
                if (counts[v] > 1) has = true
                counts[v] = 0
            }
            if (has) return true
        }
        return false
    }

    /** 是否有整行 / 整列 / 整宫全为 0（`?.` 防不规则输入越界 → 缺失行按"非空"处理） */
    const hasEmptyGroup = (grid: NumBoard): boolean => {
        for (const g of table.cells) {
            let allZero = true
            for (let i = 0; i < g.length; i++) {
                const p = g[i]
                if (grid[(p / S) | 0]?.[p % S] !== 0) {
                    allZero = false
                    break
                }
            }
            if (allZero) return true
        }
        return false
    }

    return { findConflicts, hasConflict, hasEmptyGroup }
}
