import type { GAME_STATUS, GAME_MODE, CREATE_PHASE } from "@/constants/game"

export interface GameConfig {
    boxSize: number,
    blankRatio: number
}

export type GameStatus = typeof GAME_STATUS[keyof typeof GAME_STATUS]
export type GameMode = typeof GAME_MODE[keyof typeof GAME_MODE]
export type CreatePhase = typeof CREATE_PHASE[keyof typeof CREATE_PHASE]