/**
 * 分页 / 列表条件的纯函数（搜索 / 我的题目共用）
 * stores 与 composables 都不许写 Math. → 页数、收敛、offset、条件归一化一律从这里取
 */

import { PAGER_MODE, SORT } from '../constants/puzzle'
import type { ListSort, PagerMode } from '../types/puzzle'

/** 总条数 → 总页数（无数据也算 1 页，避免页码出现 0） */
export const pageCountOf = (total: number, size: number): number => {
    if (size <= 0 || total <= 0) return 1
    return Math.ceil(total / size)
}

/** 页码收敛到 [1, pageCount] */
export const clampPage = (page: number, pageCount: number): number => {
    if (page < 1) return 1
    return page > pageCount ? pageCount : page
}

/** 页码 → 接口 offset */
export const offsetOf = (page: number, size: number): number => (page - 1) * size

/** 原始值（URL query）→ 合法排序：只认 hot，其余一律 time */
export const sortOf = (raw: unknown): ListSort => (String(raw ?? '') === SORT.Hot ? SORT.Hot : SORT.Time)

/** 原始值（本地偏好）→ 合法分页形态：只认 slider，其余一律 bar */
export const pagerModeOf = (raw: unknown): PagerMode =>
    String(raw ?? '') === PAGER_MODE.Slider ? PAGER_MODE.Slider : PAGER_MODE.Bar
