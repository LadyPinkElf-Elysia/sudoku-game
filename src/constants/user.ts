/** 账号规则：前端即时校验、后端复校，共用同一来源 */
export const UID_LENGTH = 20                 // uid / pid 的 base62 长度
export const UNAME_MIN = 2
export const UNAME_MAX = 16
/** 显示名：2~16 位中英文 / 数字 / 下划线 */
export const UNAME_PATTERN = /^[\w\u4e00-\u9fa5]{2,16}$/
/** 账号 ID：20 位 base62（大小写敏感） */
export const UID_PATTERN = /^[A-Za-z0-9]{20}$/
export const PASSWORD_MIN = 8
