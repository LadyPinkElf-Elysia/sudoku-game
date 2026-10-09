import type { GameStatus } from "@/constants/game"
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

