import type { Board, Cell, NumBoard, Position } from "@/types/board";
import { mapGrid } from "../array";

export const makeCell = (v: number, lock: boolean): Cell => ({ v, lock })

export const fromPuzzle = (nums: NumBoard, lockGiven: boolean): Board =>
    mapGrid<number, Cell>(nums, num => makeCell(num, lockGiven ? num !== 0 : false))

export const toNum = (board: Board): NumBoard =>
    mapGrid<Cell, number>(board, cell => cell.v)

export const toRC = (idx: number, S: number): Position =>
    [Math.floor(idx / S), idx % S]

export const cloneBoard = (b: Board): Board => mapGrid(b, cell => ({ ...cell }))

export const isBlankBoard = (grid: NumBoard): boolean => grid.every(row => row.every(v => v === 0))

export const lockGiven = (board: Board): Board =>
    mapGrid(board, cell => ({ v: cell.v, lock: cell.v !== 0 }))

export const applySolution = (board: Board, solution: NumBoard): Board =>
    board.map((row, r) =>
        row.map((cell, c) =>
        ({
            ...cell,
            v: solution[r][c] ?? cell.v
        })
        ))