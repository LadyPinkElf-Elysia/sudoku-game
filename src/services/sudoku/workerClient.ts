import { DEFAULT_TIMEOUT } from "@/constants/game";
import type { PuzzleData } from "@/types/puzzle";
import type { GenerateResponse } from "@/types/worker";

export const generateInWorker = (boxSize: number, blanks: number,timeoutMs=DEFAULT_TIMEOUT): Promise<PuzzleData> => {
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
            cleanup()
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
        
        worker.onmessage = (e: MessageEvent<GenerateResponse>) => {
            if (e.data.ok) finish(e.data.result)
            else fail(e.data.error || '生成失败，请重试')
        }
        
        worker.onerror = () => {
            fail('Worker 执行出错，请重试')
        }
        
        worker.postMessage({ boxSize, blanks })
    })
}
