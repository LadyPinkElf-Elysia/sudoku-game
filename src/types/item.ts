import type { Page } from './page'
import type { PagerMode, Visibility } from './puzzle'

/**
 * 一处可点动作（全站统一）：**传文本 + 点击函数**
 * · 不给 `onClick` → 就是纯文本（禁用态也这么表达，不再另设 disabled）
 * · 图形也算文本（`➖` / `👁` / `▶ 挑战`）；不额外挂悬停提示
 */
export interface Action {
    key: string
    text: string
    onClick?: () => void
}

export type Actions = Action[]



/** 下拉一项（FormField(type='select') 用：可见性 / 参考答案 / 浏览方式 / 排序 / 盘面大小 共用） */
export interface SelectOption {
    /** 选项值（支持数字，如盘面大小 B） */
    value: string | number
    /** 选项文案 */
    label: string
}

/** 列表页头工具条（ListSection 用）：左「浏览方式」、右「排序」 */
export interface ListBar {
    modeLabel: string
    modeOptions: readonly SelectOption[]
    mode: string
    sortLabel: string
    sortOptions: readonly SelectOption[]
    sort: string
}

/** 列表分页（ListSection 用）：页从 1 开始，渲染方式由 PagerBar 决定 */
export interface ListPager {
    page: number
    pageCount: number
    mode: PagerMode
}

/**
 * 「我的题目」行内控件：组件只负责画（R5：不碰 store / 路由），闭包由 composable 提供。
 * 行内不再堆图标按钮 —— 可见性 / 参考答案是下拉，预览与重命名是文字。
 */
export interface MyPuzzleRowControls {
    /** pid 取值（默认遮蔽；点 👁 / 📋 时才调） */
    loadPid: () => Promise<string | null>
    /** 该行是否正在内联重命名（是 → 标题位置换成输入框） */
    renaming: boolean
    /** 内联输入框的当前文本 */
    renameText: string
    onRenameStart: () => void
    onRenameInput: (text: string) => void
    onRenameCommit: () => void
    onRenameCancel: () => void
    onVisibility: (value: Visibility) => void
    onSolution: (on: boolean) => void
    /** answer = false 题目预览 / true 答案预览 */
    onPreview: (answer: boolean) => void
    onChallenge: () => void
    onEdit: () => void
    onRemove: () => void
}

/** 首页菜单一项：Menu（routeName 必须是 PAGE 里的路由名） */
export interface Menu {
    key: string
    icon?: string
    message: string
    routeName: Page
    disabled?: boolean
}

export type Menus = Menu[]
