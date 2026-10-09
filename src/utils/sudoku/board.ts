import type { Cell, NumBoard, Board, Position } from "@/types/game"
import { mapGrid } from "../array"

/**数字转Cell*/
export const makeCell = (v: number, lock: boolean): Cell => ({ v, lock })

/**数字数组转Board*/
export const fromPuzzle = (nums: NumBoard, lockGiven: boolean): Board =>
    mapGrid<number, Cell>(nums, (num) => makeCell(num, (lockGiven ? num !== 0 : false)))

/**Board转数字数组*/
export const toNum = (board: Board): NumBoard => mapGrid<Cell, number>(board, (cell) => cell.v)

/** 一维索引 → 行列坐标 */
export const toRC = (idx: number, S: number): Position => [Math.floor(idx / S), idx % S]