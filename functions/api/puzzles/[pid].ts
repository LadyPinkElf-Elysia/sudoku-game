import { TITLE_MAX } from '../../../src/constants/game'
import { VISIBILITY } from '../../../src/constants/puzzle'
import { requireUser } from '../../utils/auth'
import { fail, json } from '../../utils/json'
import { checkPuzzle } from '../../utils/puzzle'
import type { Env } from '../../types'

interface Row {
    pid: string; uid: string; uname: string; title: string; puzzle: string; solution: string
    side_s: number; blank_count: number; visibility: string; show_solution: number
    play_count: number; created_at: number
}
const VIS_LIST = Object.values(VISIBILITY) as readonly string[]

const load = async (env: Env, pid: string): Promise<Row | null> =>
    (await env.DB.prepare(
        'SELECT p.*, u.uname AS uname FROM puzzle p JOIN user u ON u.uid = p.uid WHERE p.pid = ?',
    ).bind(pid).first<Row>()) ?? null

/** GET：public/protected 凭 pid 任何人可看；private 仅作者（否则 404）；答案按 show_solution 下发 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
    const row = await load(env, String(params.pid))
    if (!row) return fail('题目不存在或不可访问', 404)

    const me = await requireUser(request, env)
    const myUid = me instanceof Response ? null : me.uid
    if (row.visibility === VISIBILITY.Private && row.uid !== myUid)
        return fail('题目不存在或不可访问', 404)

    const withSolution = row.show_solution === 1 || row.uid === myUid
    return json({
        pid: row.pid, title: row.title, uname: row.uname, sideS: row.side_s,
        blankCount: row.blank_count, createdAt: row.created_at, puzzleText: row.puzzle,
        ...(withSolution ? { solutionText: row.solution } : {}),
    })
}

/** PATCH：作者改 title / visibility / showSolution；改题面或答案必须成对提交并复校（不改 created_at） */
export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
    const me = await requireUser(request, env)
    if (me instanceof Response) return me
    const row = await load(env, String(params.pid))
    if (!row || row.uid !== me.uid) return fail('题目不存在或不可访问', 404)

    let body: { title?: string; puzzleText?: string; solutionText?: string; visibility?: string; showSolution?: boolean }
    try { body = await request.json() } catch { return fail('请求格式错误') }

    const sets: string[] = []
    const vals: unknown[] = []

    if (body.title !== undefined) {
        const title = body.title.trim()
        if (!title || title.length > TITLE_MAX) return fail(`标题必填，1~${TITLE_MAX} 字符`)
        sets.push('title = ?'); vals.push(title)
    }
    if (body.visibility !== undefined) {
        if (!VIS_LIST.includes(body.visibility)) return fail('可见性取值不合法')
        sets.push('visibility = ?'); vals.push(body.visibility)
    }
    if (body.showSolution !== undefined) {
        sets.push('show_solution = ?'); vals.push(body.showSolution ? 1 : 0)
    }
    if (body.puzzleText !== undefined || body.solutionText !== undefined) {
        const checked = checkPuzzle(body.puzzleText ?? '', body.solutionText ?? '')
        if (checked instanceof Response) return checked
        sets.push('puzzle = ?', 'solution = ?', 'side_s = ?', 'blank_count = ?')
        vals.push(checked.puzzleText, checked.solutionText, checked.sideS, checked.blanks)
    }
    if (!sets.length) return fail('没有要修改的字段')

    vals.push(row.pid)
    await env.DB.prepare(`UPDATE puzzle SET ${sets.join(', ')} WHERE pid = ?`).bind(...vals).run()
    return json({ ok: true })
}

/** DELETE：作者硬删 + 清理 puzzle_play */
export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
    const me = await requireUser(request, env)
    if (me instanceof Response) return me
    const pid = String(params.pid)
    const row = await load(env, pid)
    if (!row || row.uid !== me.uid) return fail('题目不存在或不可访问', 404)

    await env.DB.batch([
        env.DB.prepare('DELETE FROM puzzle_play WHERE pid = ?').bind(pid),
        env.DB.prepare('DELETE FROM puzzle WHERE pid = ?').bind(pid),
    ])
    return json({ ok: true })
}
