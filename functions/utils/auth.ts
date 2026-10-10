import type { Env } from '../types'
import { fail } from './json'

/** PBKDF2 迭代（Workers CPU 限额内；必要时下调） */
export const AUTH_ITERATIONS = 10_000
/** 会话有效期：7 天 */
export const SESSION_TTL = 7 * 24 * 3600_000
/** 登录限流：连续失败 5 次锁 10 分钟 */
export const MAX_FAILS = 5
export const LOCK_MS = 10 * 60_000

const toHex = (bytes: Uint8Array): string =>
    [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')

/** 16 字节盐（hex） */
export const makeSalt = (): string => toHex(crypto.getRandomValues(new Uint8Array(16)))
/** 32 字节会话 token（hex） */
export const makeToken = (): string => toHex(crypto.getRandomValues(new Uint8Array(32)))

/** PBKDF2-SHA256 口令哈希（hex） */
export const hashPassword = async (password: string, salt: string): Promise<string> => {
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: enc.encode(salt), iterations: AUTH_ITERATIONS, hash: 'SHA-256' },
        key,
        256,
    )
    return toHex(new Uint8Array(bits))
}

/** 恒定时间比较（避免时序侧信道） */
export const safeEqual = (a: string, b: string): boolean => {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    return diff === 0
}

/**
 * 读 Bearer → 查 session → 返回用户
 * 失败时返回 Response（调用方直接 `return result`）
 */
export const requireUser = async (
    request: Request,
    env: Env,
): Promise<{ uid: string; uname: string } | Response> => {
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return fail('请先登录', 401)

    const row = await env.DB.prepare(
        'SELECT u.uid AS uid, u.uname AS uname FROM session s JOIN user u ON u.uid = s.uid WHERE s.token = ? AND s.expires_at > ?',
    )
        .bind(token, Date.now())
        .first<{ uid: string; uname: string }>()

    if (!row) return fail('登录已过期，请重新登录', 401)
    return row
}
