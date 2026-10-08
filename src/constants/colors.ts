/** 棋盘颜色：与 BoardView 的视觉规格一一对应 */
export const BOARD_COLOR = {
    bg: '#ffffff',
    conflictBg: '#fecaca',
    givenText: '#111827',
    playerText: '#2563eb',
    selectedBorder: '#2563eb',
    thinLine: '#e5e7eb',
    thickLine: '#333333',
} as const

/** 棋盘字体栈 */
export const BOARD_FONT = {
    /** 字体栈：Latin 优先，中文兜底 */
    family: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
    /** 字重：题目粗、玩家常规 */
    given: 700,
    player: 400,
} as const
