import type { PuzzleData } from "@/types/puzzle";
import { solveAndDig } from "./solver";
import { DEFAULT_TIMEOUT } from "@/constants/worker-config";

export const generate = (boxSize: number, blanks: number,timeoutMs=DEFAULT_TIMEOUT): Promise<PuzzleData> => {
    return new Promise((resolve,reject) => {
        let settled = false
        let timer: ReturnType<typeof setTimeout> | null = null
        let worker: Worker | null = null

        /** 清理资源（定时器、Worker） */
        const cleanup = (): void => {
            if (timer) clearTimeout(timer)
            worker?.terminate()
            worker = null
        }

        const finish = (data: PuzzleData): void => {
            if (settled) return
            settled = true
            if (timer) clearTimeout(timer)
            worker?.terminate()
            worker = null
            resolve(data)
        }

        /** 失败：只 reject 一次 */
        const fail = (msg: string): void => {
            if (settled) return
            settled = true
            cleanup()
            reject(new Error(msg))
        }

        try {
            worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
        } catch {
            fail('无法创建 Worker，请重试')
            return
        }

        timer = setTimeout(() => {
            fail('生成超时，请重试')
        }, timeoutMs)

        // 3. Worker 回了消息
        worker.onmessage = (e: MessageEvent) => {
            if (e.data.ok) finish(e.data.result)
            else fail(e.data.error || '生成失败，请重试')
        }

        // 4. Worker 内部抛异常
        worker.onerror = () => {
            fail('Worker 执行出错，请重试')
        }

        // 5. 让 Worker 开始算
        worker.postMessage({ boxSize, blanks })
    })
}
