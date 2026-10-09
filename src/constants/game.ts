/** 游戏配置默认值 */
export const GAME_CONFIG = {
    boxSize: 3,
    maxSteps: 200,
    blankRatio: 0.55     
} as const

export const GAME_STATUS = {
    Idle: 'idle',
    Playing: 'playing',
    Won: 'won',
    Lost: 'lost'
} as const

export type GameStatus = typeof GAME_STATUS[keyof typeof GAME_STATUS]

/** 盘面大小可选值 */
export const BOX_SIZE_OPTIONS = [3, 4, 5, 6] as const

/** 挖空比例范围（占盘面总格数） */
export const BLANK_RATIO = {
    min: 0.5,
    max: 0.7,
    step:0.01
} as const