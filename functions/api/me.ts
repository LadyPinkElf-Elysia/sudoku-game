import { requireUser } from '../utils/auth'
import { json } from '../utils/json'
import type { Env } from '../types'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
    const user = await requireUser(request, env)
    if (user instanceof Response) return user            // 401
    return json({ user: { uid: user.uid, uname: user.uname, isGuest: false } })
}
