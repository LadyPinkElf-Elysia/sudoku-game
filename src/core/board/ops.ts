import type { Board, NumBoard } from "../../types/board"
import { mapGrid } from "../array"

export const cloneBoard = (b: Board): Board => mapGrid(b, cell => ({ ...cell }))

export const isBlankBoard = (grid: NumBoard): boolean => grid.every(row => row.every(v => v === 0))

export const lockGiven = (board: Board): Board =>
    mapGrid(board, cell => ({ v: cell.v, lock: cell.v !== 0 }))

export const applySolution = (board: Board, solution: NumBoard): Board =>
    board.map((row, r) => row.map((cell, c) => ({ ...cell, v: solution[r][c] ?? cell.v })))

/** 空格数（0 的个数） */
export const countBlanks = (board: NumBoard): number =>
    board.reduce((n, row) => n + row.reduce((m, v) => m + (v === 0 ? 1 : 0), 0), 0)

/** 题面盘：只留锁定的已知格（玩家填的与空格都算 0）——游戏页「导出题目」出题面串用 */
export const givenBoard = (board: Board): NumBoard =>
    mapGrid(board, cell => (cell.lock ? cell.v : 0))