/**
 * 游戏域的**纯数据常量**（配置 / 状态 / 模式 / 来源 / 规模 / 上限）
 * · 文案统一在 `constants/copy.ts`
 * · 按钮上的字在 `constants/actions.ts` 的 `ACTION` 表
 */

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
    Solve: 'solve',
} as const

/**
 * 开局来源（决定游戏页给不给「导出题目」）
 * · 只有**系统生成**的盘既没有 pid 也没有现成串 → 才需要导出
 * · 自定义：串本来就在你手上；挑战：有 pid / 落地页可分享
 */
export const GAME_ORIGIN = {
    System: 'system',
    Custom: 'custom',
    Challenge: 'challenge',
} as const

/**
 * 一局存档（本地）的落盘参数 —— 适配器在 `services/saveGame.ts`
 * · `key` 下存的是**一个数组**（可以有多条存档；继续游戏页按条列出）
 * · `maxCount` 条数上限（超出丢最旧的）；`maxChars` 是**字符数**上限（localStorage 一般 5MB，按 UTF-16 粗算留一半余量）
 */
export const SAVE = {
    key: 'gameSaves',
    version: 2,
    maxCount: 10,
    maxChars: 1500000,
} as const

/** 出题页阶段 */
export const CREATE_PHASE = {
    Puzzle: 'puzzle',
    Solution: 'solution',
} as const

/** 盘面大小可选值 */
export const BOX_SIZE_OPTIONS = [2, 3, 4, 5, 6, 7, 8,9,10] as const

/** 盘面大小下拉项（值 = 宫边长 B，文案 = 盘面边长 S×S；FormField(type='select') 用） */
export const BOX_SIZE_SELECT_OPTIONS = BOX_SIZE_OPTIONS.map((b) => ({ value: b, label: `${b * b} X ${b * b}` }))

/** 挖空比例范围（占盘面总格数） */
export const BLANK_RATIO = {
    min: 0.4,
    max: 0.65,
    step: 0.01
} as const

/** 超时上限*/
export const DEFAULT_TIMEOUT = 15000

/** 题目标题长度上限 */
export const TITLE_MAX = 40

/**
 * 自定义 / 求解页 textarea 的输入上限：按最大盘面 B=10 算（100×100 = 10000 个数字
 * + 最多 9999 个分隔符 ≈ 2 万字符），再留余量 —— 原来只按 B=6（1296）算，大棋盘串会被截断
 */
export const CUSTOM_TEXT_MAX = 20000
