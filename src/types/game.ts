import type { Board, Position, Snapshot } from "./board"

export interface GameConfig {
    boxSize: number,
    maxSteps:number,
    blankRatio: number
}

export interface Game {
    board: Board
    selected: Position | null
    status: GameStatus
    config: GameConfig
    history: Snapshot[]
    stepPtr: number
}

export const GAME_STATUS = {
    Idle: 'idle',
    Playing: 'playing',
    Won: 'won',
    Lost: 'lost'
} as const

export type GameStatus = typeof GAME_STATUS[keyof typeof GAME_STATUS]