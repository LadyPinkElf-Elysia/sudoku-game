import type { Board, Cell, NumBoard, Position } from "../../types/board";
import { mapGrid } from "../array";

export const makeCell = (v: number, lock: boolean): Cell => ({ v, lock })

export const fromPuzzle = (nums: NumBoard, lockGiven: boolean): Board =>
    mapGrid<number, Cell>(nums, num => makeCell(num, lockGiven ? num !== 0 : false))

export const toNum = (board: Board): NumBoard =>
    mapGrid<Cell, number>(board, cell => cell.v)

export const toRC = (idx: number, S: number): Position =>
    [Math.floor(idx / S), idx % S]

