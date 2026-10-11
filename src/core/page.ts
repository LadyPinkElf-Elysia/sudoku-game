/**
 * 分页纯函数（搜索 / 我的题目列表共用）
 * stores 与 composables 都不许写 Math. → 页数、收敛、offset 一律从这里取
 */

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
