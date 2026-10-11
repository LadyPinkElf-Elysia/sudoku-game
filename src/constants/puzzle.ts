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

/** 分页形态：纯 UI 偏好 → 本地偏好（不进 URL，见 R15） */
export const PAGER_MODE = {
    Bar: 'bar',
    Slider: 'slider',
} as const

export const PAGER_MODE_COPY = {
    bar: '进度条',
    slider: '滑动条',
} as const

/** 本地偏好键名（services/prefs.ts 会补 sudoku. 前缀） */
export const PREF_KEY_PAGER_MODE = 'pagerMode'

/** 可见性徽标文案（我的题目行内 / 三态切换按钮） */
export const PUZZLE_VISIBILITY_COPY = {
    public: '🌐 公开',
    protected: '🔗 受保护',
    private: '🔒 私有',
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

/** 我的题目页文案 */
export const MINE_COPY = {
    empty: '你还没有出过题',
    goCreate: '去出题 →',
    rename: '重命名',
    renamePlaceholder: '1~40 位',
    removeTitle: '⚠️ 删除题目',
    removeConfirm: '删除后不可恢复，确定删除这道题吗？',
    pidHidden: 'pid ▮▮▮▮▮▮▮▮',
    uidHidden: 'uid ▮▮▮▮▮▮▮▮',
    showUid: '显示 uid',
    hideUid: '隐藏 uid',
    copyUid: '复制 uid',
    preview: '题目预览',
    answerPreview: '答案预览',
    challenge: '挑战',
    edit: '编辑',
    remove: '删除',
    showPid: '显示 pid',
    hidePid: '隐藏 pid',
    copyPid: '复制 pid',
    copied: '已复制',
    solutionOn: '参考答案：开',
    solutionOff: '参考答案：关',
    save: '保存',
    cancel: '取消',
} as const
