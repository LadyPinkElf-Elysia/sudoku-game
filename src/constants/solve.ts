/** 题目求解页：输入方式（粘字符串 / 直接填棋盘） */
export const SOLVE_INPUT_MODE = {
    Text: 'text',
    Board: 'board',
} as const

/** 解数上限的硬天花板（与 core/sudoku/multiSolver 的 MAX_SOLUTIONS 对齐） */
export const SOLVE_LIMIT_MAX = 50

/** 至多解数默认值 */
export const SOLVE_LIMIT_DEFAULT = 3

/** 至多解数下拉项（值 = 个数） */
export const SOLVE_LIMIT_OPTIONS = [
    { value: 1, label: '1 个' },
    { value: 2, label: '2 个' },
    { value: 3, label: '3 个' },
    { value: 5, label: '5 个' },
    { value: 10, label: '10 个' },
] as const

/** 可求解的最大宫边长（再大回溯会很慢） */
export const SOLVE_MAX_BOX_SIZE = 6

/** 求解超时（多解比生成慢，比 DEFAULT_TIMEOUT 给得更宽） */
export const SOLVE_TIMEOUT = 30000

/** 题目求解页文案 */
export const SOLVE_COPY = {
    title: '🧩 题目求解',
    modeLabel: '输入方式',
    modeText: '题目字符串',
    modeBoard: '棋盘填入',
    puzzleLabel: '题面（0 表示空格；空格 / 逗号 / 换行分隔）',
    boxSizeLabel: '盘面大小',
    fillBoard: '⬇ 填入棋盘',
    clearBoard: '🧹 清空棋盘',
    limitLabel: '至多解数',
    solveLabel: '🧮 求解',
    solving: '正在求解…',
    resultLabel: '求解结果',
    solutionUnit: '个解',
    limitNote: '已达上限',
    blank: '题面不能全空',
    noSolution: '这盘无解',
    badPuzzle: '题面格式不对（数字个数需为 16 / 81 / 256 / 625 / 1296）',
    conflict: '题面存在冲突，请先修正',
    tooBig: '盘面太大：宫边长请控制在 6 以内（36×36）',
    timeout: '求解超时，请减少解数或换小一点的盘面',
    fail: '求解失败，请重试',
} as const
