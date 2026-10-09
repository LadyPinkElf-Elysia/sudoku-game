/** 游戏配置默认值 */
export const GAME_CONFIG = {
    boxSize: 6,
    maxSteps: 200,
    blanks: 40,      // 9×9 的 50%
} as const

/** 盘面大小可选值 */
export const BOX_SIZE_OPTIONS = [3, 4, 5] as const

/** 挖空比例范围（占盘面总格数） */
export const BLANK_RATIO = {
    min: 0.5,
    max: 0.7,
} as const