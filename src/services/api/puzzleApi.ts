import type { MyPuzzle, MyPuzzleDetail, PuzzleDetail, SearchResult, Visibility } from '@/types/puzzle'
import { request } from './client'

export interface Page<T> { items: T[] }
export interface SearchQuery { keyword?: string; uid?: string; sort?: 'time' | 'hot'; page?: number; size?: number }

const qs = (q: Record<string, string | number | undefined>): string => {
    const p = new URLSearchParams()
    Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== '') p.set(k, String(v)) })
    const s = p.toString()
    return s ? `?${s}` : ''
}

/** 搜索公开题（只回 pid / title / sideS / blankCount） */
export const search = (q: SearchQuery = {}): Promise<Page<SearchResult>> =>
    request<Page<SearchResult>>(`/puzzles${qs({
        keyword: q.keyword, uid: q.uid, sort: q.sort ?? 'time',
        limit: q.size ?? 10, offset: ((q.page ?? 1) - 1) * (q.size ?? 10),
    })}`)

/** 我的题目（需登录；只回 rowId，不含 pid） */
export const listMine = (q: { page?: number; size?: number; sort?: 'time' | 'hot' } = {}): Promise<Page<MyPuzzle>> =>
    request<Page<MyPuzzle>>(`/puzzles${qs({
        mine: 1, sort: q.sort ?? 'time',
        limit: q.size ?? 10, offset: ((q.page ?? 1) - 1) * (q.size ?? 10),
    })}`)

/** 公开详情：public / protected 凭 pid 任何人可看；private 非作者 404；答案按 show_solution 下发 */
export const getOne = (pid: string): Promise<PuzzleDetail> => request<PuzzleDetail>(`/puzzles/${pid}`)

/** 作者态详情：一次拿全 pid + 题面 + 答案（显示/复制 pid、答案预览、编辑、挑战都走它） */
export const getMine = (rowId: string): Promise<MyPuzzleDetail> => request<MyPuzzleDetail>(`/puzzles/mine/${rowId}`)

/** 新建（服务端复校 40%~70%） */
export const create = (
    payload: { title: string; puzzleText: string; solutionText: string },
): Promise<{ pid: string; rowId: string }> =>
    request<{ pid: string; rowId: string }>('/puzzles', { method: 'POST', body: payload })

/** 修改（局部；改题面或答案时**必须成对**提交） */
export const update = (
    pid: string,
    patch: { title?: string; puzzleText?: string; solutionText?: string; visibility?: Visibility; showSolution?: boolean },
): Promise<{ ok: true }> => request<{ ok: true }>(`/puzzles/${pid}`, { method: 'PATCH', body: patch })

/** 删除（作者） */
export const remove = (pid: string): Promise<{ ok: true }> =>
    request<{ ok: true }>(`/puzzles/${pid}`, { method: 'DELETE' })

/** 挑战计数（进入游戏页时调；1 人 1 小时 1 次，作者不计） */
export const play = (pid: string): Promise<{ playCount: number; counted: boolean }> =>
    request<{ playCount: number; counted: boolean }>(`/puzzles/${pid}/play`, { method: 'POST' })
