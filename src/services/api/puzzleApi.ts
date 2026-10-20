import { LIST_PAGE_SIZE, SORT } from '@/constants/puzzle'
import type { ListSort, MyPuzzle, MyPuzzleDetail, PuzzleDetail, PuzzlePatch, SearchResult, Visibility } from '@/types/puzzle'
import { request } from './client'

/** 页码 → 接口 offset（只有本文件用 → 内部函数） */
const offsetOf = (page: number, size: number): number => (page - 1) * size

/** 带总数的分页响应（total 用来算页数、收敛越界页码） */
export interface Paged<T> { items: T[]; total: number }

export interface SearchQuery { keyword?: string; uid?: string; sort?: ListSort; page?: number; size?: number }

const qs = (q: Record<string, string | number | undefined>): string => {
    const p = new URLSearchParams()
    Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== '') p.set(k, String(v)) })
    const s = p.toString()
    return s ? `?${s}` : ''
}

/** 搜索公开题（回 pid / title / sideS / blankCount / uname） */
export const search = (q: SearchQuery = {}): Promise<Paged<SearchResult>> => {
    const size = q.size ?? LIST_PAGE_SIZE
    const page = q.page ?? 1
    return request<Paged<SearchResult>>(`/puzzles${qs({
        keyword: q.keyword, uid: q.uid, sort: q.sort ?? SORT.Time,
        limit: size, offset: offsetOf(page, size),
    })}`)
}

/** 我的题目（需登录；只回 rowId，不含 pid） */
export const listMine = (q: { page?: number; size?: number; sort?: ListSort } = {}): Promise<Paged<MyPuzzle>> => {
    const size = q.size ?? LIST_PAGE_SIZE
    const page = q.page ?? 1
    return request<Paged<MyPuzzle>>(`/puzzles${qs({
        mine: 1, sort: q.sort ?? SORT.Time,
        limit: size, offset: offsetOf(page, size),
    })}`)
}

/** 公开详情：public / protected 凭 pid 任何人可看；private 非作者 404；答案按 show_solution 下发 */
export const getOne = (pid: string): Promise<PuzzleDetail> => request<PuzzleDetail>(`/puzzles/${pid}`)

/** 作者态详情：一次拿全 pid + 题面 + 答案（显示/复制 pid、答案预览、编辑、挑战都走它） */
export const getMine = (rowId: string): Promise<MyPuzzleDetail> => request<MyPuzzleDetail>(`/puzzles/mine/${rowId}`)

/** 新建（服务端复校 40%~65%）；出题页默认 public，自定义提交传 private */
export const create = (
    payload: { title: string; puzzleText: string; solutionText: string; visibility?: Visibility },
): Promise<{ pid: string; rowId: string }> =>
    request<{ pid: string; rowId: string }>('/puzzles', { method: 'POST', body: payload })

/** 修改（局部；改题面或答案时**必须成对**提交） */
export const update = (pid: string, patch: PuzzlePatch): Promise<{ ok: true }> =>
    request<{ ok: true }>(`/puzzles/${pid}`, { method: 'PATCH', body: patch })

/** 删除（作者） */
export const remove = (pid: string): Promise<{ ok: true }> =>
    request<{ ok: true }>(`/puzzles/${pid}`, { method: 'DELETE' })

/** 挑战计数（开局时调；1 人 1 小时 1 次，作者不计） */
export const play = (pid: string): Promise<{ playCount: number; counted: boolean }> =>
    request<{ playCount: number; counted: boolean }>(`/puzzles/${pid}/play`, { method: 'POST' })
