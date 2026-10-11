/**
 * 本地会话存储（services 层唯一碰 localStorage 的地方）
 * 键名统一 sudoku. 前缀；隐私模式下 localStorage 可能抛错 → 全部包一层
 */
const TOKEN_KEY = 'sudoku.token'
const UID_KEY = 'sudoku.lastUid'

const read = (key: string): string => {
    try { return localStorage.getItem(key) ?? '' } catch { return '' }
}
const write = (key: string, value: string): void => {
    try { localStorage.setItem(key, value) } catch { /* 忽略 */ }
}
const drop = (key: string): void => {
    try { localStorage.removeItem(key) } catch { /* 忽略 */ }
}

export const getToken = (): string => read(TOKEN_KEY)
export const setToken = (token: string): void => write(TOKEN_KEY, token)
export const clearToken = (): void => drop(TOKEN_KEY)

/** 上次登录的账号 ID（登录页预填用） */
export const getLastUid = (): string => read(UID_KEY)
export const setLastUid = (uid: string): void => write(UID_KEY, uid)
