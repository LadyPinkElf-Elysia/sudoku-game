/**
 * 全站文案（**按钮条除外**）—— **一处定义，不要再分散到各域常量里**
 * · 按钮上的字写在 `constants/actions.ts` 的 `ACTION` 表里（"按钮条的文案写在按钮条那里"）
 * · 这里放：遮罩文案（标题 / 说明 / 提示）· 表单标签与错误 · 空态 / 状态 · 徽标 · 元信息标签 · 口令与校验提示
 * · 仍守 R10：constants 只放值（不导出类型、不放函数）；需要按入参拼装的（如带百分比的错误）由 core 拼
 * · 下拉项数据（`*_OPTIONS`）跟着它的域放；只有 `PUZZLE_VISIBILITY_OPTIONS` 因为 label 直接取徽标文案，一并放这里
 */

/** 逻辑驱动的静态文案 */
export const GAME_COPY = {
    win: { title: '🎉 恭喜完成', desc: '全部填对，太厉害了' },
} as const

/** 游戏页「📋 导出题目」遮罩：题面串（与 parsePuzzle 对称；**不含答案**）—— 按钮上的字在 `ACTION.exportPuzzle` / `ACTION.copyPuzzle` / `ACTION.close` */
export const EXPORT_COPY = {
    title: '题目导出',
    puzzleLabel: '题面串（粘贴到「题目求解」或「自定义」即可用）',
    puzzleShort: '题面串',
    copyFail: '复制失败，请手动选中文本复制',
} as const

/** 存档相关文案（**按钮上的字不在这里**：「继续 / 删除」在 `ACTION.resumeSave` / `ACTION.removeSave`） */
export const SAVE_COPY = {
    title: '继续游戏',
    saved: '已存档 —— 在主页「继续游戏」里可以选它',
    empty: '还没有存档',
    broken: '本地存档读不出来（可能已损坏），请回游戏页重新存档',
    tooBig: '这一局的历史太长，本地存不下（换小一点的盘面）',
    removed: '已删除该存档',
    /** 存档条第一行：有标题用标题，否则按来源给个名字（键 = GAME_ORIGIN 的值） */
    origin: {
        system: '系统生成',
        custom: '自定义题',
        challenge: '挑战题',
    },
    savedAt: '存档于',
    stepLabel: '进度',
    stepUnit: '步',
} as const

/** 出题页标题默认值前缀（实际默认标题 = 「我的题目 9×9」，边长由 core 算） */
export const TITLE_PREFIX = '我的题目'

/** 入库前的挖空比例提示（出题 / 编辑 / 自定义共用；当前百分比现场拼） */
export const RATIO_COPY = {
    bad: '挖空比例需在 40%~65% 之间',
} as const

/** 题面不得出现「整行 / 整列 / 整宫全空」（自定义 / 出题 / 编辑提交题面时校验） */
export const EMPTY_GROUP_COPY = {
    bad: '题面不能有整行 / 整列 / 整宫全空',
} as const

/** 自定义开局页静态文案 */
export const CUSTOM_COPY = {
    puzzleLabel: '题面（0 表示空格；空格 / 逗号 / 换行分隔）',
    solutionLabel: '答案（全非 0，尺寸必须与题面一致）',
    saveLabel: '提交到我的题目',
    titlePlaceholder: '给这道题起个名字（1~40 位）',
    validating: '正在校验并提交…',
    empty: '题面与答案都必须填写',
    badPuzzle: '题面格式不对（数字个数需为 16 / 81 / 256 / 625 / 1296 / 2401 / 4096 / 6561 / 10000）',
    badSolution: '答案格式不对（应为全非 0 的合法终盘）',
    sizeMismatch: '盘面大小必须一致',
    puzzleBlank: '题面不能全空',
    emptyGroup: '题面不能有整行 / 整列 / 整宫全空',
    notMatched: '题面与答案不一致，或答案不是合法终盘',
    needTitle: '请填写标题（1~40 位）',
    saved: '已保存到我的题目',
} as const

/** 搜索页文案 */
export const SEARCH_COPY = {
    placeholder: '搜标题 / 出题人，或粘贴 20 位 ID',
    action: '搜索',
    browseLabel: '浏览方式',
    sortLabel: '排序',
    preview: '题目预览',
    challenge: '挑战',
    loading: '加载中…',
    empty: '没有找到题目',
    retry: '重试',
    authorPrefix: '出题人：',
    authorSuffix: '的公开题',
} as const

/** 题目元信息行的标签（列表项 / 题目详情 / 游戏页信息行共用一套） */
export const PUZZLE_META_COPY = {
    size: '盘面大小',
    blank: '挖空',
    created: '创建时间',
    hot: '热度',
    author: '出题人',
} as const

/** 可见性徽标文案（我的题目行内 / 可见性下拉项） */
export const PUZZLE_VISIBILITY_COPY = {
    public: '🌐 公开',
    protected: '🔗 受保护',
    private: '🔒 私有',
} as const

/** 可见性下拉项（label 直接取徽标文案 → 跟着它一起放这里，避免 constants 之间互相 import） */
export const PUZZLE_VISIBILITY_OPTIONS = [
    { value: 'public', label: PUZZLE_VISIBILITY_COPY.public },
    { value: 'protected', label: PUZZLE_VISIBILITY_COPY.protected },
    { value: 'private', label: PUZZLE_VISIBILITY_COPY.private },
] as const

/** 我的题目页文案 */
export const MINE_COPY = {
    empty: '你还没有出过题',
    goCreate: '去出题 →',
    rename: '重命名',
    renamePlaceholder: '1~40 位',
    removeTitle: '⚠️ 删除题目',
    removeConfirm: '删除后不可恢复，确定删除这道题吗？',
    /** 敏感值的标签（pid / uid）；遮蔽、显示、复制那套交互在 SecretValue 组件里 */
    pidTag: 'pid',
    uidTag: 'uid',
    preview: '题目预览',
    answerPreview: '答案预览',
    challenge: '挑战',
    edit: '编辑',
    remove: '删除',
    /** 行内控件标签（竖排：标签 + 下拉） */
    visibilityLabel: '可见性',
    solutionLabel: '显示答案',
    save: '保存',
} as const

/** 题目求解页文案（「⬇ 填入棋盘 / 🧹 清空棋盘 / 🧮 求解」三个**按钮**上的字在 ACTION 里） */
export const SOLVE_COPY = {
    title: '🧩 题目求解',
    modeLabel: '输入方式',
    modeText: '题目字符串',
    modeBoard: '棋盘填入',
    puzzleLabel: '题面（0 表示空格；空格 / 逗号 / 换行分隔）',
    boxSizeLabel: '盘面大小',
    limitLabel: '至多解数',
    solving: '正在求解…',
    resultLabel: '求解结果',
    solutionUnit: '个解',
    limitNote: '已达上限',
    blank: '题面不能全空',
    noSolution: '这盘无解',
    badPuzzle: '题面格式不对（数字个数需为 16 / 81 / 256 / 625 / 1296 / 2401 / 4096 / 6561 / 10000）',
    conflict: '题面存在冲突，请先修正',
    tooBig: '盘面太大：宫边长请控制在 6 以内（36×36）',
    timeout: '求解超时，请减少解数或换小一点的盘面',
    fail: '求解失败，请重试',
} as const

/** 账号相关静态文案（后端也会 import 它；**「退出 / 复制 / 已复制 / 我已保存」四个按钮字在 ACTION 里**） */
export const AUTH_COPY = {
    needLogin: '该功能需要登录才可以使用',
    login: '登录',
    register: '注册',
    uidLabel: '账号 ID',
    /** 顶栏「👤 用户名」tooltip：登录后唯一的「我的」入口里有什么 */
    meTitle: '我的（账号 ID + 我的题目）',
    /** 显示名内联重命名（「我的」页账号区：名字右边） */
    rename: '重命名',
    renamePlaceholder: '改名（2~16 位中英文 / 数字 / 下划线）',
    uidHint: '登录需要它，请保存到安全的地方（只存在你本地）',
    needAuth: '请先登录',
    sessionExpired: '登录已过期，请重新登录',
    badCredentials: '账号 ID 或密码错误',
    badPayload: '请求格式错误',
    unameInvalid: '用户名需 2~16 位（中英文 / 数字 / 下划线）',
    passwordTooShort: '密码至少 8 位',
    copyFailed: '复制失败，请手动选中复制',
    passwordMismatch: '两次输入的密码不一致',
    uidInvalid: '账号 ID 格式不对（20 位字母数字）',
    wait: '请稍候…',
} as const
