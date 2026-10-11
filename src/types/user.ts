/** 用户（uid 是登录凭据 → 敏感，仅自己可见） */
export interface User {
    uid: string
    uname: string
    isGuest: boolean
}

/** 注册：只填显示名与密码；uid 由服务端生成 */
export interface RegisterPayload {
    uname: string
    password: string
}

/** 登录：账号 ID + 密码 */
export interface LoginPayload {
    uid: string
    password: string
}

/** 注册 / 登录成功响应 */
export interface AuthResponse {
    token: string
    user: User
}
