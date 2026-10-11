import type { Page } from './page'
import type { Visibility } from './puzzle'

/** 展示项公共字段：按钮条（ActionItems）与菜单（MenuItems）共用 */
export interface ItemBase {
    key: string
    icon?: string
    message: string
}

/** 按钮条一项：ActionItems / ActionItem */
export interface Action extends ItemBase {
    disabled?: boolean
    onClick: () => void
}

/** 值右侧裸图标组（ValueIcons）的参数：uid / pid 的 👁 睁/闭 + 📋 复制 */
export interface ValueIconsProps {
    /** 值当前是否已明文 */
    revealed: boolean
    /** 眼睛的提示（显示 / 隐藏） */
    eyeLabel: string
    /** 复制按钮的提示（复制 / 已复制） */
    copyLabel: string
    /** 复制图标（📋 → 复制成功后 ✅） */
    copyIcon: string
    onToggle: () => void
    onCopy: () => void
}

export type Actions=Action[]

/** 纯文字操作一项：无边框、无底色（TextButtons 用；样式 .text-btn 在全局 form.css） */
export interface TextItem {
    key: string
    /** 按钮上的文字 */
    label: string
    onClick: () => void
}

export type TextItems = TextItem[]

/**
 * 「我的题目」行内控件：组件只负责画（R5：不碰 store / 路由），闭包由 composable 提供。
 * 行内不再堆图标按钮 —— 可见性 / 参考答案是下拉，预览与重命名是文字。
 */
export interface MyPuzzleRowControls {
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

/** 首页菜单一项：MenuItems / MenuItem（routeName 必须是 PAGE 里的路由名） */
export interface Menu extends ItemBase {
    routeName: Page
    disabled?: boolean
}

export type Menus=Menu[]
