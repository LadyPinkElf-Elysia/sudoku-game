import { requireUser } from '../../../utils/auth'
import { fail, json } from '../../../utils/json'
import type { Env } from '../../../types'

/** GET：作者态详情（一次拿全 pid + 题面 + 答案 + 状态；uname 供 MyPuzzleDetail extends PuzzleDetail） */
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
    const me = await requireUser(request, env)
    if (me instanceof Response) return me

    const row = await env.DB.prepare(
        `SELECT p.pid, p.row_id AS rowId, p.title, u.uname, p.side_s AS sideS,
                p.blank_count AS blankCount, p.visibility, p.show_solution AS showSolution,
                p.play_count AS playCount, p.created_at AS createdAt,
                p.puzzle AS puzzleText, p.solution AS solutionText
         FROM puzzle p JOIN user u ON u.uid = p.uid
         WHERE p.row_id = ? AND p.uid = ?`,
    ).bind(String(params.rowId), me.uid).first()

    if (!row) return fail('题目不存在或不可访问', 404)
    return json(row)
}
