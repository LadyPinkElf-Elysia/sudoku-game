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



