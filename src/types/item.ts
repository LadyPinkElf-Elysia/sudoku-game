import type { Page } from './page'

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

/** 首页菜单一项：MenuItems / MenuItem（routeName 必须是 PAGE 里的路由名） */
export interface Menu extends ItemBase {
    routeName: Page
    disabled?: boolean
}

export type Menus=Menu[]
