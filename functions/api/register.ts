import { AUTH_COPY } from '../../src/constants/copy'
import { PASSWORD_MIN, UNAME_PATTERN } from '../../src/constants/user'
import { hashPassword, makeSalt, makeToken, SESSION_TTL } from '../utils/auth'
import { makeUid, makeUniqueId } from '../utils/id'
import { fail, json } from '../utils/json'
import { toPublicUser } from '../utils/user'
import type { Env } from '../types'

interface Payload { uname?: string; password?: string }

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
    let body: Payload
    try { body = await request.json<Payload>() } catch { return fail(AUTH_COPY.badPayload) }

    const uname = (body.uname ?? '').trim()
    const password = body.password ?? ''
    if (!UNAME_PATTERN.test(uname)) return fail(AUTH_COPY.unameInvalid)
    if (password.length < PASSWORD_MIN) return fail(AUTH_COPY.passwordTooShort)

    // uid：生成 + 查重
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

    return json({ token, user: toPublicUser(uid, uname) })
}
