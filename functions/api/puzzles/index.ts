import { VISIBILITY } from '../../../src/constants/game'
import { requireUser } from '../../utils/auth'
import { makePid, makeRowId, makeUniqueId } from '../../utils/id'
import { fail, json } from '../../utils/json'
import { checkPuzzle } from '../../utils/puzzle'
import type { Env } from '../../types'

/** GET：搜索（只回公开题）／我的题目（?mine=1，需登录，只回 rowId）；都回 total 供前端分页 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
    const url = new URL(request.url)
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 10) || 10, 50)
    const offset = Math.max(Number(url.searchParams.get('offset') ?? 0) || 0, 0)

    if (url.searchParams.get('mine') === '1') {
        const me = await requireUser(request, env)
        if (me instanceof Response) return me

        const counted = await env.DB.prepare('SELECT COUNT(*) AS n FROM puzzle WHERE uid = ?')
            .bind(me.uid).first<{ n: number }>()
        const { results } = await env.DB.prepare(
            `SELECT row_id AS rowId, title, side_s AS sideS, blank_count AS blankCount,
                    visibility, show_solution AS showSolution, play_count AS playCount,
                    created_at AS createdAt
             FROM puzzle WHERE uid = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        ).bind(me.uid, limit, offset).all()
        return json({ items: results, total: counted?.n ?? 0 })
    }

    // ORDER BY 只来自白名单，绝不拼用户输入
    const order = url.searchParams.get('sort') === 'hot'
        ? 'p.play_count DESC, p.created_at DESC'
        : 'p.created_at DESC'
    const uid = url.searchParams.get('uid') ?? ''
    const keyword = (url.searchParams.get('keyword') ?? '').trim()
    const like = `%${keyword}%`

    const where = `WHERE p.visibility = ?
           AND (? = '' OR p.uid = ?)
           AND (? = '' OR p.title LIKE ? OR u.uname LIKE ?)`

    const counted = await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM puzzle p JOIN user u ON u.uid = p.uid ${where}`,
    ).bind(VISIBILITY.Public, uid, uid, keyword, like, like).first<{ n: number }>()

    const { results } = await env.DB.prepare(
        `SELECT p.pid AS pid, p.title AS title, p.side_s AS sideS, p.blank_count AS blankCount,
                p.play_count AS playCount, p.created_at AS createdAt,
                u.uname AS uname
         FROM puzzle p JOIN user u ON u.uid = p.uid
         ${where}
         ORDER BY ${order} LIMIT ? OFFSET ?`,
    ).bind(VISIBILITY.Public, uid, uid, keyword, like, like, limit, offset).all()

    return json({ items: results, total: counted?.n ?? 0 })
}

/** 可见性白名单：只认三态常量，其它一律回落 public */
const visibilityOf = (raw: unknown): string =>
    raw === VISIBILITY.Private ? VISIBILITY.Private
        : raw === VISIBILITY.Protected ? VISIBILITY.Protected
            : VISIBILITY.Public

/** POST：新建（服务端复校：格式 / 同尺寸 / 非空 / 40~70% / 题面答案一致） */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
    const me = await requireUser(request, env)
    if (me instanceof Response) return me

    let body: { title?: string; puzzleText?: string; solutionText?: string; visibility?: string }
    try { body = await request.json() } catch { return fail('请求格式错误') }

    const checked = checkPuzzle(body.puzzleText ?? '', body.solutionText ?? '')
    if (checked instanceof Response) return checked

    const title = (body.title ?? '').trim()
    if (!title) return fail('标题必填')

    const visibility = visibilityOf(body.visibility)

    const pid = await makeUniqueId(makePid, async id =>
        !!(await env.DB.prepare('SELECT 1 FROM puzzle WHERE pid = ?').bind(id).first()))
    const rowId = await makeUniqueId(makeRowId, async id =>
        !!(await env.DB.prepare('SELECT 1 FROM puzzle WHERE row_id = ?').bind(id).first()))

    const now = Date.now()
    await env.DB.prepare(
        `INSERT INTO puzzle (pid, row_id, uid, title, puzzle, solution, side_s, blank_count,
                             visibility, show_solution, play_count, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,0,0,?)`,
    ).bind(pid, rowId, me.uid, title, checked.puzzleText, checked.solutionText,
        checked.sideS, checked.blanks, visibility, now).run()

    return json({
        pid, rowId, title, sideS: checked.sideS, blankCount: checked.blanks,
        visibility, createdAt: now,
    })
}
