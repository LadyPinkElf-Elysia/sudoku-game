/** 统一 JSON 响应 */
export const json = (data: unknown, status = 200): Response =>
    new Response(JSON.stringify(data), {
        status,
        headers: { 'content-type': 'application/json; charset=utf-8' },
    })

/** 统一错误响应（前端 client.ts 会把 error 字段提出来当 Error.message） */
export const fail = (error: string, status = 400): Response => json({ error }, status)
