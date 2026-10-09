/** 游戏配置默认值 boxSize = 宫边长 B，盘面边长 S = B² */
export const GAME_INIT_CONFIG = {
    boxSize: 3,
    blankRatio: 0.5     
} as const

export const GAME_STATUS = {
    Idle: 'idle',
    Playing: 'playing',
    Won: 'won',
} as const

export const GAME_MODE = {
    Game: 'game',
    Create: 'create',
} as const

/** 出题页阶段 */
export const CREATE_PHASE = {
    Puzzle: 'puzzle',
    Solution: 'solution',
} as const

/** 盘面大小可选值 */
export const BOX_SIZE_OPTIONS = [3, 4, 5, 6] as const

/** 挖空比例范围（占盘面总格数） */
export const BLANK_RATIO = {
    min: 0.4,
    max: 0.7,
    step:0.01
} as const

/** 超时上限*/
export const DEFAULT_TIMEOUT = 20000