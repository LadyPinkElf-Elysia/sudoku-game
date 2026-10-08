/** 棋盘尺寸 */
export const BOARD_SIZE = {
    /** 容器宽度占比（0~1） */
    widthRatio: 0.70,
    /** 最小边长（像素） */
    minSide: 240,
    /** 最大边长（像素） */
    maxSide: 420,
    /** 字号占格子比例（0~1） */
    fontSizeRatio: 0.55,
    /** 最小字号（像素），再小就看不清 */
    minFontSize: 8,
} as const

/** 棋盘线宽 */
export const BOARD_LINE = {
    /** 普通格子细线 */
    thin: 1,
    /** 宫格粗线（含外框） */
    thick: 2,
    /** 选中格空心框 */
    selected: 2,
} as const

/** 缩放配置 */
export const BOARD_ZOOM = {
    min: 0.5,
    max: 3,
    step: 0.1,
    default: 1,
} as const