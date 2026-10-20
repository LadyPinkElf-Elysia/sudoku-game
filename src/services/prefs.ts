/**
 * 纯 UI 偏好的本地存储（与 api/session.ts 同规则）
 * 键名统一 sudoku. 前缀；隐私模式下 localStorage 可能抛错 → 全部包一层
 */
const PREFIX = 'sudoku.'

export const readPref = (key: string): string => {
    try { return localStorage.getItem(PREFIX + key) ?? '' } catch { return '' }
}

export const writePref = (key: string, value: string): boolean => {
    try { localStorage.setItem(PREFIX + key, value); return true } catch { return false }
}

export const clearPref = (key: string): void => {
    try { localStorage.removeItem(PREFIX + key) } catch { /* 忽略 */ }
}
