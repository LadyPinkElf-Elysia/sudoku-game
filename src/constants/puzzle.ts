/** 列表分页大小（搜索 / 我的题目共用） */
export const LIST_PAGE_SIZE = 10

/** 排序：时间优先 / 热度优先（并列按 createdAt DESC，排序规则在后端白名单） */
export const SORT = {
    Time: 'time',
    Hot: 'hot',
} as const

export const SORT_OPTIONS = [
    { value: SORT.Time, label: '时间优先' },
    { value: SORT.Hot, label: '热度优先' },
] as const

/** 浏览方式：分页条（进度条 / 滑动条）+ 步骤条（游戏页历史记录，不进下拉） */
export const PAGER_MODE = {
    Bar: 'bar',
    Slider: 'slider',
    Steps: 'steps',
} as const

/** 浏览方式下拉项（与 SORT_OPTIONS 同形：value 来自 PAGER_MODE） */
export const PAGER_MODE_OPTIONS = [
    { value: PAGER_MODE.Bar, label: '进度条' },
    { value: PAGER_MODE.Slider, label: '滑动条' },
] as const

/** 本地偏好键名（services/prefs.ts 会补 sudoku. 前缀） */
export const PREF_KEY_PAGER_MODE = 'pagerMode'

/** 题目可见性（题目的属性 → 归位到 puzzle；**文案在下拉项里，见 constants/copy.ts**） */
export const VISIBILITY = {
    Public: 'public',
    Protected: 'protected',
    Private: 'private',
} as const

/** 可见性下拉值（布尔用 on / off 便于 <select> 绑定） */
export const SOLUTION_VALUE = {
    On: 'on',
    Off: 'off',
} as const

/** 参考答案下拉项 */
export const SOLUTION_OPTIONS = [
    { value: SOLUTION_VALUE.On, label: '开' },
    { value: SOLUTION_VALUE.Off, label: '关' },
] as const


