import type { Page } from './page'
import type { PagerMode, Visibility } from './puzzle'

/**
 * 一处可点动作（全站统一）：**传文本 + 点击函数 + 禁用标记**
 * · `disabled` 由 `ACTION_OF` 在"没给点击函数"时置 true —— 消费方只认这个字段，
 *   不再靠"有没有 onClick"反推（隐式协议最容易漏）
 * · 图形也算文本（`➖` / `👁` / `▶ 挑战`）；不额外挂悬停提示
 */
export interface Action {
    key: string
    text: string
    onClick?: () => void
    /** 不可点（禁用）：文案照常显示，只是不能点 */
    disabled?: boolean
}

export type Actions = Action[]



/** 下拉一项（FormField(type='select') 用：可见性 / 参考答案 / 浏览方式 / 排序 / 盘面大小 共用） */
export interface SelectOption {
    /** 选项值（支持数字，如盘面大小 B） */
    value: string | number
    /** 选项文案 */
    label: string
}

/** 列表页头上的一个筛选下拉（标签 + 当前值 + 选项） */
export interface ListFilter {
    /** 标签文案（由 constants/copy 的 LIST_COPY 给） */
    label: string
    /** 当前值 */
    value: string
    /** 选项 */
    options: readonly SelectOption[]
}

/** 列表页头工具条（ListSection 用）：左「浏览方式」、右「排序」—— 由 `useListQuery` 产出，页面不再拼 */
export interface ListBar {
    mode: ListFilter
    sort: ListFilter
}

/** 列表分页（ListSection 用）：页从 1 开始，渲染方式由 mode 决定 */
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

/** 首页菜单一项：Menu（`to` 是"去哪"的路由描述，不是路由名 —— 模板里可以直接给 RouterLink）
 *  图标不在这里：`constants` 只放值，图标映射见 `pages/HomePage.vue` 的 `MENU_ICON`（按 key 取 EP 图标） */
export interface Menu {
    key: string
    message: string
    to: { name: Page }
    disabled?: boolean
}

export type Menus = Menu[]
