import type { Env } from '../types'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    if (token) await env.DB.prepare('DELETE FROM session WHERE token = ?').bind(token).run()
    return new Response(null, { status: 204 })
}
