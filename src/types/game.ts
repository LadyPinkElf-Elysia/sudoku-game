import type { GameStatus } from "@/constants/enums"

export interface Cell {
    v: number
    lock: boolean
}

export type Board = Cell[][]
export type NumBoard=number[][]
export type ConflictMask=boolean[][]
export type Snapshot = Cell[][]

export type Position = readonly [row: number, col: number]

export interface GameConfig {
    boxSize: number,
    maxSteps:number
}

export interface Game {
    board: Board
    selected: Position | null
    status: GameStatus
    config: GameConfig
    history: Snapshot[]
    stepPtr: number
}