import type { Board, ConflictMask, Position } from "@/types/board"
import type { FrameState, RedrawMode } from "@/types/render"

/**
 * 重绘决策（**纯函数模块**，可单测；没有一行状态）
 *   · `dirtyCellsOf` —— 比对两帧快照 → 本帧要重画的格子（脏格）
 *   · `redrawModeOf` —— 由"脏格 + 位图是否刚重建 + 边长"决定走整盘还是局量
 *
 * 快照（`FrameState`，见 types/render.ts）只记"会影响像素的东西"，所以比对快照 = 比对画面：
 *   · 值（v）        —— 玩家填 / 擦
 *   · 归属（lock）   —— 题面锁定时，同一个数字要换成粗体深色（v 没变、外观变了）
 *   · 冲突标记（mask）—— 红底出现或消失（冲突会牵连整行/列/宫，靠比掩码自然覆盖，不必猜）
 *   · 选中（selected）—— 旧格要去框、新格要画框
 * 用扁平 TypedArray + 双缓冲：填一遍 S²、比一遍 S²，全程零分配（B=10 时约 0.03ms，相对重绘可忽略）
 */

/** 建快照缓冲（盘面尺寸变化时重建） */
export const makeFrameState = (size: number): FrameState => {
    const total = size * size
    return { vals: new Uint16Array(total), locks: new Uint8Array(total), mask: new Uint8Array(total), selected: null, size }
}

/** 把当前数据写进快照（覆盖式，不分配）——★ 这里只记"会被画出来的东西" */
export const fillFrameState = (
    st: FrameState,
    board: Board,
    conflictMask?: ConflictMask,
    selected?: Position | null,
): void => {
    const size = board.length
    const { vals, locks, mask } = st
    let i = 0
    for (let r = 0; r < size; r++) {
        const row = board[r]
        const mrow = conflictMask?.[r]
        for (let c = 0; c < size; c++, i++) {
            const cell = row[c]
            vals[i] = cell ? cell.v : 0
            locks[i] = cell && cell.lock ? 1 : 0
            mask[i] = mrow?.[c] ? 1 : 0        // 与 paintCell 取色条件保持一致
        }
    }
    st.selected = selected ?? null
}

/** 取某格在快照里的扁平下标；不在盘内返回 -1 */
const indexOf = (p: Position, size: number): number =>
    p[0] >= 0 && p[0] < size && p[1] >= 0 && p[1] < size ? p[0] * size + p[1] : -1

/**
 * 比对两帧 → 本帧要重画的格子（扁平下标 `r*S+c`）
 * 返回 null = 应当**整盘重画**：尺寸变了 / 脏格太多（不足总量的 1/3）时，小块贴图不如整盘一遍划算
 */
export const dirtyCellsOf = (prev: FrameState, next: FrameState, maxRatio = 1 / 3): number[] | null => {
    const size = next.size
    if (prev.size !== size) return null

    const total = size * size
    const pv = prev.vals
    const pl = prev.locks
    const pm = prev.mask
    const nv = next.vals
    const nl = next.locks
    const nm = next.mask

    const dirty: number[] = []
    for (let i = 0; i < total; i++) {
        if (nv[i] !== pv[i] || nl[i] !== pl[i] || nm[i] !== pm[i]) dirty.push(i)
    }

    // 选中变化的两个格子（旧格要抹掉框）
    const a = prev.selected ? indexOf(prev.selected, size) : -1
    const b = next.selected ? indexOf(next.selected, size) : -1
    if (a !== b) {
        if (a >= 0) dirty.push(a)
        if (b >= 0) dirty.push(b)
    }

    if (dirty.length > total * maxRatio) return null
    return dirty
}

/** 本帧该走哪条重绘路径（**纯函数**）：位图刚重建 / 边长变了 → 整盘；否则"有脏格"就走局量 */
export const redrawModeOf = (
    dirty: readonly number[] | null,
    resized: boolean,
    side: number,
    lastSide: number,
): RedrawMode => (dirty && !resized && side === lastSide ? 'dirty' : 'full')
