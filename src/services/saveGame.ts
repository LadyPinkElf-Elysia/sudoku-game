import { GAME_ORIGIN, SAVE } from '@/constants/game'
import { sideOf } from '@/core/sudoku/shape'
import { clearPref, readPref, writePref } from '@/services/prefs'
import type { Board, NumBoard } from '@/types/board'
import type { GameSave } from '@/types/game'

/**
 * 一局存档的本地落盘（localStorage 适配器）—— **存的是一张表**（继续游戏页按条列出）
 * · **读的时候一律当不可信输入**：JSON 坏 / 版本不认识 / 形状不对 → 该条丢弃；整表坏就清掉
 *   （否则一个坏存档会让页面每次进都崩，而用户不知道该删什么）
 * · **写失败有两条路**：字符串超上限（历史太长）、或 localStorage 写不进（配额满 / 隐私模式）
 * · 与 `services/prefs.ts` 同规则：任何一次存储访问都可能抛错，全部包一层
 */

/** 方阵形状（行数、每行长度都等于 S） */
const isSquare = (v: unknown, size: number): v is unknown[][] =>
    Array.isArray(v) && v.length === size
    && v.every((row) => Array.isArray(row) && row.length === size)

/** 全 0..S 的整数方阵（题面 / 答案） */
const isNumBoard = (v: unknown, size: number): v is NumBoard =>
    isSquare(v, size)
    && v.every((row) => row.every((n) =>
        typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= size))

/** 带 lock 的格子方阵（盘面 / 历史快照） */
const isBoard = (v: unknown, size: number): v is Board =>
    isSquare(v, size)
    && v.every((row) => row.every((cell) => {
        if (typeof cell !== 'object' || cell === null) return false
        const c = cell as { v?: unknown; lock?: unknown }
        return typeof c.v === 'number' && Number.isInteger(c.v) && c.v >= 0 && c.v <= size
            && typeof c.lock === 'boolean'
    }))

const isMeta = (v: unknown): boolean => {
    if (typeof v !== 'object' || v === null) return false
    const m = v as Record<string, unknown>
    return ['pid', 'title', 'uname'].every((k) => typeof m[k] === 'string')
}

/** 选中位置：null 或 [行, 列]（都在盘面内） */
const isSelected = (v: unknown, size: number): boolean =>
    v === null || (Array.isArray(v) && v.length === 2
        && v.every((n) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < size))

/**
 * 结构校验：只认 `GameSave` 里**真实存在**的字段
 * （版本 / id / 时间 / 来源 / 题源信息 / 配置 / 答案 / 每一步快照 / 当前步 / 选中）
 * ⚠️ 改了 `types/game.ts` 的 `GameSave` 必须同步这里，否则会把合法存档全判成坏数据（表现：存完看不到）
 */
const isSave = (v: unknown): v is GameSave => {
    if (typeof v !== 'object' || v === null) return false
    const s = v as Record<string, unknown>
    if (s.version !== SAVE.version || typeof s.savedAt !== 'number') return false
    if (typeof s.id !== 'string' || !s.id) return false
    if (!(Object.values(GAME_ORIGIN) as string[]).includes(String(s.origin))) return false
    if (!isMeta(s.meta)) return false

    const config = s.config as { boxSize?: unknown; blankRatio?: unknown } | undefined
    const boxSize = config?.boxSize
    if (typeof boxSize !== 'number' || !Number.isInteger(boxSize) || boxSize < 1) return false
    if (typeof config?.blankRatio !== 'number') return false

    const size = sideOf(boxSize)
    const solution = s.solution
    if (!(Array.isArray(solution) && (solution.length === 0 || isNumBoard(solution, size)))) return false
    if (!Array.isArray(s.snapshots) || !s.snapshots.length) return false
    if (!s.snapshots.every((snap) => isBoard(snap, size))) return false

    const step = s.currentStep
    if (typeof step !== 'number' || !Number.isInteger(step) || step < 0 || step >= s.snapshots.length)
        return false
    return isSelected(s.selected, size)
}

/** 本地是否有存档数据（**只看键在不在**：用来区分"没存过"和"存了但读不出来"） */
export const hasSaveData = (): boolean => readPref(SAVE.key) !== ''

/** 读全部存档：坏条目单条丢弃、整表坏就清掉；**按存档时间倒序**（新的在上） */
export const readSaves = (): GameSave[] => {
    const raw = readPref(SAVE.key)
    if (!raw) return []
    let data: unknown
    try { data = JSON.parse(raw) } catch { clearPref(SAVE.key); return [] }
    if (!Array.isArray(data)) { clearPref(SAVE.key); return [] }
    return data.filter(isSave).sort((a, b) => b.savedAt - a.savedAt)
}

/** 写整张表：超上限 / 存储写不进 → false（调用方给提示） */
export const writeSaves = (list: GameSave[]): boolean => {
    let raw = ''
    try { raw = JSON.stringify(list) } catch { return false }
    return raw.length <= SAVE.maxChars && writePref(SAVE.key, raw)
}

/** 新增或覆盖一条（同 id 覆盖）；条数超上限丢最旧的 */
export const addSave = (save: GameSave): boolean => {
    const rest = readSaves().filter((s) => s.id !== save.id)
    return writeSaves([save, ...rest].slice(0, SAVE.maxCount))
}

/** 删一条：true = 真删掉了（id 不存在 → false） */
export const removeSaveById = (id: string): boolean => {
    const list = readSaves()
    const next = list.filter((s) => s.id !== id)
    if (next.length === list.length) return false
    return writeSaves(next)
}

/** 清空全部存档（读到坏表 / 想从头来时可调） */
export const clearSaves = (): void => clearPref(SAVE.key)
