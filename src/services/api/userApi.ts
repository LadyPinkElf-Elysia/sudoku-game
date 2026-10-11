import type { AuthResponse, LoginPayload, RegisterPayload, User } from '@/types/user'
import { request } from './client'
import { clearToken, getToken, setLastUid, setToken } from './session'

/** 注册：成功即登录（顺带记下 uid 供登录页预填） */
export const register = async (payload: RegisterPayload): Promise<AuthResponse> => {
    const res = await request<AuthResponse>('/register', { method: 'POST', body: payload, auth: false })
    setToken(res.token)
    setLastUid(res.user.uid)
    return res
}

/** 登录 */
export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
    const res = await request<AuthResponse>('/login', { method: 'POST', body: payload, auth: false })
    setToken(res.token)
    setLastUid(res.user.uid)
    return res
}

/** 退出：先通知后端删 session，再清本地 token */
export const logout = async (): Promise<void> => {
    try { await request<void>('/logout', { method: 'POST' }) } finally { clearToken() }
}

/** 用本地 token 静默恢复登录态；无 token 直接返回 null（不发请求） */
export const me = async (): Promise<User | null> => {
    if (!getToken()) return null
    const res = await request<{ user: User }>('/me')
    return res.user
}
