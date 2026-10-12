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

/** 题目可见性（题目的属性 → 归位到 puzzle；下拉项与文案都在本文件） */
export const VISIBILITY = {
    Public: 'public',
    Protected: 'protected',
    Private: 'private',
} as const

/** 可见性徽标文案（我的题目行内 / 可见性下拉项） */
export const PUZZLE_VISIBILITY_COPY = {
    public: '🌐 公开',
    protected: '🔗 受保护',
    private: '🔒 私有',
} as const

/** 可见性下拉项（我的题目行内：三态改成下拉，不再用循环按钮） */
export const PUZZLE_VISIBILITY_OPTIONS = [
    { value: VISIBILITY.Public, label: PUZZLE_VISIBILITY_COPY.public },
    { value: VISIBILITY.Protected, label: PUZZLE_VISIBILITY_COPY.protected },
    { value: VISIBILITY.Private, label: PUZZLE_VISIBILITY_COPY.private },
] as const

/** 参考答案下拉值（布尔用 on / off 便于 <select> 绑定） */
export const SOLUTION_VALUE = {
    On: 'on',
    Off: 'off',
} as const

/** 参考答案下拉项 */
export const SOLUTION_OPTIONS = [
    { value: SOLUTION_VALUE.On, label: '开' },
    { value: SOLUTION_VALUE.Off, label: '关' },
] as const

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
    cancel: '取消',
} as const
