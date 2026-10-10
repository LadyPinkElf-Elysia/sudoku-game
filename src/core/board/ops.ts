import type { Board, NumBoard } from "../../types/board"
import { mapGrid } from "../array"

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

/** 空格数（0 的个数） */
export const countBlanks = (board: NumBoard): number =>
    board.reduce((n, row) => n + row.reduce((m, v) => m + (v === 0 ? 1 : 0), 0), 0)