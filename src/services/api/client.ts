import { clearToken, getToken } from './session'

/** 接口错误（status 便于上层区分 401 / 403 / 404 / 429） */
export class ApiError extends Error {
    readonly status: number
    constructor(status: number, message: string) {
        super(message)
        this.name = 'ApiError'
        this.status = status
    }
}

type Listener = () => void
const unauthorizedListeners = new Set<Listener>()

/** 401 通知订阅者（stores/user 用它把登录态置空；services 不反向依赖 stores） */
export const onUnauthorized = (cb: Listener): void => { unauthorizedListeners.add(cb) }

const notifyUnauthorized = (): void => {
    clearToken()
    unauthorizedListeners.forEach(cb => cb())
}

interface Options {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    body?: unknown
    /** 是否带 token（注册 / 登录传 false） */
    auth?: boolean
}

/**
 * 统一请求：
 * · 自动带 Bearer（来自 session）
 * · 204 直接返回 undefined
 * · 401 → 清 token + 通知（再抛 ApiError，消息用后端返回的文案）
 * · 非 JSON 响应（打到静态资源）→ 抛「接口不存在或服务异常」，避免 Unexpected token <
 */
export const request = async <T>(path: string, { method = 'GET', body, auth = true }: Options = {}): Promise<T> => {
    const headers: Record<string, string> = {}
    if (body !== undefined) headers['content-type'] = 'application/json'
    if (auth) {
        const token = getToken()
        if (token) headers.Authorization = `Bearer ${token}`
    }

    const res = await fetch(`/api${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    })

    if (res.status === 204) return undefined as T
    if (res.status === 401) notifyUnauthorized()

    if (!(res.headers.get('content-type') ?? '').includes('json'))
        throw new ApiError(res.status, '接口不存在或服务异常')

    const data = (await res.json()) as T & { error?: string }
    if (!res.ok) throw new ApiError(res.status, data.error ?? `请求失败（${res.status}）`)
    return data
}
