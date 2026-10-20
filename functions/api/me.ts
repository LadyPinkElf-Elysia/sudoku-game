import { AUTH_COPY } from '../../src/constants/copy'
import { UNAME_PATTERN } from '../../src/constants/user'
import { requireUser } from '../utils/auth'
import { fail, json } from '../utils/json'
import { toPublicUser } from '../utils/user'
import type { Env } from '../types'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
    const user = await requireUser(request, env)
    if (user instanceof Response) return user            // 401
    return json({ user: toPublicUser(user.uid, user.uname) })
}

/** PATCH：改显示名（登录凭据是 uid，uname 允许重名 → 不做唯一性校验，与注册一致） */
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
    const user = await requireUser(request, env)
    if (user instanceof Response) return user

    let body: { uname?: string }
    try { body = await request.json<{ uname?: string }>() } catch { return fail(AUTH_COPY.badPayload) }

    const uname = (body.uname ?? '').trim()
    if (!UNAME_PATTERN.test(uname)) return fail(AUTH_COPY.unameInvalid)

    await env.DB.prepare('UPDATE user SET uname = ? WHERE uid = ?').bind(uname, user.uid).run()
    return json({ user: toPublicUser(user.uid, uname) })
}
