import { hashPassword, makeToken, safeEqual, LOCK_MS, MAX_FAILS, SESSION_TTL } from '../utils/auth'
import { fail, json } from '../utils/json'
import type { Env } from '../types'

interface Payload { uid?: string; password?: string }
const BAD = '账号 ID 或密码错误'
const UID_RE = /^[A-Za-z0-9]{20}$/

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
    let body: Payload
    try { body = await request.json<Payload>() } catch { return fail('请求格式错误') }

    const uid = (body.uid ?? '').trim()
    const password = body.password ?? ''
    if (!UID_RE.test(uid) || !password) return fail(BAD, 401)      // 不区分"账号不存在/密码错"，防枚举

    const now = Date.now()
    const attempt = await env.DB.prepare(
        'SELECT fails, locked_until FROM login_attempt WHERE uid = ?',
    ).bind(uid).first<{ fails: number; locked_until: number }>()

    if (attempt && attempt.locked_until > now) {
        const mins = Math.ceil((attempt.locked_until - now) / 60_000)
        return fail(`尝试次数过多，请 ${mins} 分钟后再试`, 429)
    }

    /** 失败：累加计数（到阈值就锁定 10 分钟） */
    const recordFail = async (): Promise<Response> => {
        const fails = (attempt?.fails ?? 0) + 1
        const locked = fails >= MAX_FAILS ? now + LOCK_MS : 0
        await env.DB.prepare(
            `INSERT INTO login_attempt (uid, fails, locked_until, last_at) VALUES (?,?,?,?)
             ON CONFLICT(uid) DO UPDATE SET fails = excluded.fails,
                                            locked_until = excluded.locked_until,
                                            last_at = excluded.last_at`,
        ).bind(uid, locked ? 0 : fails, locked, now).run()
        return fail(BAD, 401)
    }

    const user = await env.DB.prepare(
        'SELECT uid, uname, password_hash, salt FROM user WHERE uid = ?',
    ).bind(uid).first<{ uid: string; uname: string; password_hash: string; salt: string }>()

    if (!user) return recordFail()
    if (!safeEqual(await hashPassword(password, user.salt), user.password_hash)) return recordFail()

    // 成功：清限流 + 发 token
    await env.DB.prepare('DELETE FROM login_attempt WHERE uid = ?').bind(uid).run()
    const token = makeToken()
    await env.DB.prepare(
        'INSERT INTO session (token, uid, created_at, expires_at) VALUES (?,?,?,?)',
    ).bind(token, uid, now, now + SESSION_TTL).run()

    return json({ token, user: { uid: user.uid, uname: user.uname, isGuest: false } })
}
