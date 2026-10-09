import type { NumBoard } from "@/types/board";
import { chunk } from "../grid";

const parseNumArray = (str: string): number[] | null => {
    const tokens = str.trim().split(/[\s,，]+/).filter(Boolean)
    if (!tokens.length) return null
    const nums = tokens.map(t => Number(t))
    if (nums.some(n => !Number.isInteger(n))) return null
    return nums
}

const perfectSqrt = (n: number): number | null => {
    if (!Number.isInteger(n) || n < 1) return null
    const s = Math.round(Math.sqrt(n))
    return s * s === n ? s : null
}

/**根据字符串转化为NumBoard*/
export const parseNumBoard = (str: string): NumBoard | null => {
    const nums = parseNumArray(str)
    if (!nums) return null

    const side = perfectSqrt(nums.length)
    if (side === null) return null
    if (perfectSqrt(side) === null) return null
    if (nums.some(n => n < 0 || n > side)) return null

    return chunk<number>(nums, side)
}

/**根据NumBoard转化为字符串 */
export const boardToStr = (board: NumBoard): string => board.flat().join(' ')