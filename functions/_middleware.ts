import { fail } from './utils/json'
import type { Env } from './types'

/** 全局兜底：未捕获异常 → 统一 JSON（前端 client.ts 只解析 JSON） */
export const onRequest: PagesFunction<Env> = async (context) => {
    try {
        return await context.next()
    } catch (err) {
        const msg = err instanceof Error ? err.message : '服务器错误'
        return fail(msg, 500)
    }
}
