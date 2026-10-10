import { BLANK_RATIO } from "../../constants/game"

/** 宫边长 B → 盘面边长 S */
export const sideOf = (boxSize: number): number => boxSize * boxSize

/** 盘面总格数 S * S */
export const cellCountOf = (boxSize: number): number => sideOf(boxSize) ** 2

/** 挖空格数 = floor(总格数 × 比例) */
export const blankCountOf = (boxSize: number, ratio: number): number =>
    Math.floor(cellCountOf(boxSize) * ratio)

/** 盘面边长 S → 宫边长 B；S 不是完全平方数返回 null */
export const boxSizeOf = (side: number): number | null => {
    if (!Number.isInteger(side) || side < 1) return null
    const b = Math.round(Math.sqrt(side))
    return b * b === side ? b : null
}

/** 挖空比例是否在允许区间（闭区间，带 EPS 抗浮点） */
export const isBlankRatioOk = (blankCount: number, boxSize: number): boolean => {
    const cells = cellCountOf(boxSize)
    if (cells <= 0) return false
    const ratio = blankCount / cells
    return ratio >= BLANK_RATIO.min - 1e-9 && ratio <= BLANK_RATIO.max + 1e-9
}