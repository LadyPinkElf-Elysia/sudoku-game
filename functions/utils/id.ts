import { UID_LENGTH } from '../../src/constants/user'

const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
/** rowId 长度（后端专属：前端只透传，不校验） */
const ROW_ID_LENGTH = 8

/** 生成 len 位 base62 随机串（拒绝采样，无取模偏差；用 crypto 不用 Math.random） */
export const makeId = (len: number): string => {
    const out: string[] = []
    while (out.length < len) {
        for (const b of crypto.getRandomValues(new Uint8Array(len))) {
            if (b < 248) out.push(BASE62[b % 62])      // 248 = 62×4 → 丢 8 个值，保证均匀
            if (out.length === len) break
        }
    }
    return out.join('')
}

export const makeUid = (): string => makeId(UID_LENGTH)       // 用户 uid
export const makePid = (): string => makeId(UID_LENGTH)       // 题目 pid（与 uid 同规则）
export const makeRowId = (): string => makeId(ROW_ID_LENGTH)  // 我的题目列表行标识

/** 带查重的生成：命中已存在就重生成 */
export const makeUniqueId = async (
    gen: () => string,
    exists: (id: string) => Promise<boolean>,
    tries = 5,
): Promise<string> => {
    for (let i = 0; i < tries; i++) {
        const id = gen()
        if (!(await exists(id))) return id
    }
    throw new Error('id 生成冲突，请重试')
}
