export const GAME_STATUS = {
    Idle: 'idle',
    Playing: 'playing',
    Won: 'won',
    Lost: 'lost'
} as const

export const PAGE = {
    Game:'game',
} as const

export type GameStatus = typeof GAME_STATUS[keyof typeof GAME_STATUS]
export type Page = typeof PAGE[keyof typeof PAGE]
