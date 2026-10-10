import { hashPassword, makeSalt, makeToken, SESSION_TTL } from '../utils/auth'
import { makeUid, makeUniqueId } from '../utils/id'
import { fail, json } from '../utils/json'
import type { Env } from '../types'

const UNAME_RE = /^[\w\u4e00-\u9fa5]{2,16}$/
const PASSWORD_MIN = 8

interface Payload { uname?: string; password?: string }

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
    let body: Payload
    try { body = await request.json<Payload>() } catch { return fail('请求格式错误') }

    const uname = (body.uname ?? '').trim()
    const password = body.password ?? ''
    if (!UNAME_RE.test(uname)) return fail('用户名需 2~16 位（中英文 / 数字 / 下划线）')
    if (password.length < PASSWORD_MIN) return fail(`密码至少 ${PASSWORD_MIN} 位`)

    // uid：生成 + 查重（20 位 base62，几乎不会撞）
    const uid = await makeUniqueId(makeUid, async id =>
        !!(await env.DB.prepare('SELECT 1 FROM user WHERE uid = ?').bind(id).first()),
    )

    const salt = makeSalt()
    const now = Date.now()
    await env.DB.prepare(
        'INSERT INTO user (uid, uname, password_hash, salt, created_at) VALUES (?,?,?,?,?)',
    ).bind(uid, uname, await hashPassword(password, salt), salt, now).run()

    const token = makeToken()
    await env.DB.prepare(
        'INSERT INTO session (token, uid, created_at, expires_at) VALUES (?,?,?,?)',
    ).bind(token, uid, now, now + SESSION_TTL).run()

    return json({ token, user: { uid, uname, isGuest: false } })
}
