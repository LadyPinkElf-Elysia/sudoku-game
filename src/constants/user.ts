/** 账号规则：前端即时校验、后端复校，共用同一来源 */
export const UID_LENGTH = 20                 // uid / pid 的 base62 长度
export const UNAME_MIN = 2
export const UNAME_MAX = 16
/** 显示名：2~16 位中英文 / 数字 / 下划线 */
export const UNAME_PATTERN = /^[\w\u4e00-\u9fa5]{2,16}$/
/** 账号 ID：20 位 base62（大小写敏感） */
export const UID_PATTERN = /^[A-Za-z0-9]{20}$/
export const PASSWORD_MIN = 8

/** 账号相关静态文案（后端返回、前端直接展示；需要按入参拼装的另说） */
export const AUTH_COPY = {
    needLogin: '该功能需要登录才可以使用',
    myPuzzles: '我的题目',
    login: '登录',
    register: '注册',
    logout: '退出',
    uidLabel: '账号 ID',
    uidHint: '登录需要它，请保存到安全的地方（只存在你本地）',
    needAuth: '请先登录',
    sessionExpired: '登录已过期，请重新登录',
    badCredentials: '账号 ID 或密码错误',
    badPayload: '请求格式错误',
    unameInvalid: `用户名需 ${UNAME_MIN}~${UNAME_MAX} 位（中英文 / 数字 / 下划线）`,
    passwordTooShort: `密码至少 ${PASSWORD_MIN} 位`,
    copy: '复制',
    copied: '已复制',
    copyFailed: '复制失败，请手动选中复制',
    saved: '我已保存，开始使用',
    passwordMismatch: '两次输入的密码不一致',
    uidInvalid: '账号 ID 格式不对（20 位字母数字）',
    wait: '请稍候…',
} as const
