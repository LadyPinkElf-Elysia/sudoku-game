import { clearPref, readPref, writePref } from '../prefs'

/**
 * 本地会话存储（键名由 prefs 统一补 `sudoku.` 前缀）
 * 只放「登录凭据」相关：token 与上次登录的账号 ID
 */
const TOKEN_KEY = 'token'
const UID_KEY = 'lastUid'

export const getToken = (): string => readPref(TOKEN_KEY)
export const setToken = (token: string): void => {
    writePref(TOKEN_KEY, token)
}
export const clearToken = (): void => clearPref(TOKEN_KEY)

/** 上次登录的账号 ID（登录页预填用） */
export const getLastUid = (): string => readPref(UID_KEY)
export const setLastUid = (uid: string): void => {
    writePref(UID_KEY, uid)
}
