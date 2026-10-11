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

/** 逻辑驱动的静态文案（纯静态、无格式化 → 放数据层） */
export const GAME_COPY = {
    win: { title: '🎉 恭喜完成', desc: '全部填对，太厉害了' },
} as const

/** 出题页阶段 */
export const CREATE_PHASE = {
    Puzzle: 'puzzle',
    Solution: 'solution',
} as const

/** 盘面大小可选值 */
export const BOX_SIZE_OPTIONS = [3, 4, 5, 6] as const

/** 盘面大小下拉项（值 = 宫边长 B，文案 = 盘面边长 S×S；FormField(type='select') 用） */
export const BOX_SIZE_SELECT_OPTIONS = BOX_SIZE_OPTIONS.map((b) => ({ value: b, label: `${b * b} X ${b * b}` }))

/** 挖空比例范围（占盘面总格数） */
export const BLANK_RATIO = {
    min: 0.4,
    max: 0.7,
    step: 0.01
} as const

/** 超时上限*/
export const DEFAULT_TIMEOUT = 20000

/** 题目标题长度上限 */
export const TITLE_MAX = 40

/** 出题页标题默认值前缀（实际默认标题 = 「我的题目 9×9」，边长由 core 算） */
export const TITLE_PREFIX = '我的题目'

/** 入库前的挖空比例提示（出题 / 编辑 / 自定义共用；当前百分比现场拼） */
export const RATIO_COPY = {
    bad: '挖空比例需在 40%~70% 之间',
} as const

/** 自定义页两个 textarea 的输入上限（B=6 时最多 1296 个数字 + 分隔符，留足余量） */
export const CUSTOM_TEXT_MAX = 4000

/** 自定义开局页静态文案 */
export const CUSTOM_COPY = {
    puzzleLabel: '题面（0 表示空格；空格 / 逗号 / 换行分隔）',
    solutionLabel: '答案（全非 0，尺寸必须与题面一致）',
    saveLabel: '提交到我的题目',
    titlePlaceholder: '给这道题起个名字（1~40 位）',
    validating: '正在校验并提交…',
    empty: '题面与答案都必须填写',
    badPuzzle: '题面格式不对（数字个数需为 16 / 81 / 256 / 625 / 1296）',
    badSolution: '答案格式不对（应为全非 0 的合法终盘）',
    sizeMismatch: '盘面大小必须一致',
    puzzleBlank: '题面不能全空',
    notMatched: '题面与答案不一致，或答案不是合法终盘',
    needTitle: '请填写标题（1~40 位）',
    saved: '已保存到我的题目',
} as const
