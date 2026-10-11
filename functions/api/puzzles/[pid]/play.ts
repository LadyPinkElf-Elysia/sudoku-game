import { requireUser } from '../../../utils/auth'
import { fail, json } from '../../../utils/json'
import type { Env } from '../../../types'

/** 热度去重窗口：同一人 1 小时 1 次 */
const HOUR_MS = 3600_000

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
    const me = await requireUser(request, env)
    if (me instanceof Response) return me
    const pid = String(params.pid)

    const p = await env.DB.prepare('SELECT uid, play_count AS playCount FROM puzzle WHERE pid = ?')
        .bind(pid).first<{ uid: string; playCount: number }>()
    if (!p) return fail('题目不存在', 404)
    if (p.uid === me.uid) return json({ playCount: p.playCount, counted: false })   // 作者本人不计

    const now = Date.now()
    const last = await env.DB.prepare('SELECT played_at FROM puzzle_play WHERE pid = ? AND uid = ?')
        .bind(pid, me.uid).first<{ played_at: number }>()
    if (last && now - last.played_at < HOUR_MS) return json({ playCount: p.playCount, counted: false })

    await env.DB.batch([
        env.DB.prepare(
            `INSERT INTO puzzle_play (pid, uid, played_at) VALUES (?,?,?)
             ON CONFLICT(pid, uid) DO UPDATE SET played_at = excluded.played_at`,
        ).bind(pid, me.uid, now),
        env.DB.prepare('UPDATE puzzle SET play_count = play_count + 1 WHERE pid = ?').bind(pid),
    ])
    return json({ playCount: p.playCount + 1, counted: true })
}
