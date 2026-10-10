import type { Cell } from "@/types/board"

export const hintTextOf = (cell: Cell | null, candidates: number[]): string => {
    if (!cell) return '请选中一个格子'
    if (cell.lock) return '无法更改初始题目'
    return `此格可以填：${candidates.join('、') || '无'}`
}