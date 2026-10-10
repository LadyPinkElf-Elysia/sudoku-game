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

export type Actions=Action[]

/** 首页菜单一项：MenuItems / MenuItem */
export interface Menu extends ItemBase {
    routeName: string
}

export type Menus=Menu[]