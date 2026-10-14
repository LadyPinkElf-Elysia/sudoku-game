import { DEFAULT_TIMEOUT } from "@/constants/game";
import { SOLVE_COPY, SOLVE_TIMEOUT } from "@/constants/solve";
import type { NumBoard } from "@/types/board";
import type { PuzzleData } from "@/types/puzzle";
import type { GenerateResponse, SolveResponse, WorkerRequest } from "@/types/worker";

/**
 * 一次性 Worker 调用（生成 / 多解共用同一条通道）：
 * · 每次 new Worker，拿到结果或失败就 terminate（不复用 → 不会带上一次的状态）
 * · 超时 / onerror / 回包失败 都只结算一次
 */
const runInWorker = <Res>(req: WorkerRequest, timeoutMs: number, timeoutCopy: string, failCopy: string): Promise<Res> => {
    return new Promise((resolve, reject) => {
        let settled = false
        let timer: ReturnType<typeof setTimeout> | null = null
        let worker: Worker | null = null

        /** 清理资源（定时器、Worker） */
        const cleanup = (): void => {
            if (timer) clearTimeout(timer)
            worker?.terminate()
            worker = null
        }

        const finish = (data: Res): void => {
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
            fail(failCopy)
            return
        }

        timer = setTimeout(() => {
            fail(timeoutCopy)
        }, timeoutMs)

        worker.onmessage = (e: MessageEvent<GenerateResponse | SolveResponse>) => {
            if (e.data.ok) finish(e.data.result as Res)
            else fail(e.data.error || failCopy)
        }

        worker.onerror = () => {
            fail(failCopy)
        }

        worker.postMessage(req)
    })
}

/** 生成题目（难度页 / 自定义页）：Worker 里跑，避免大棋盘卡住 UI */
export const generateInWorker = (boxSize: number, blanks: number, timeoutMs = DEFAULT_TIMEOUT): Promise<PuzzleData> =>
    runInWorker<PuzzleData>({ kind: 'generate', boxSize, blanks }, timeoutMs, '生成超时，请重试', '生成失败，请重试')

/** 多解求解（题目求解页）：最多找 maxSolutions 个解；无解由 Worker 回「这盘无解」 */
export const solveMultiInWorker = (
    board: NumBoard,
    maxSolutions: number,
    timeoutMs = SOLVE_TIMEOUT,
): Promise<NumBoard[]> =>
    runInWorker<NumBoard[]>(
        { kind: 'solve', board, maxSolutions },
        timeoutMs,
        SOLVE_COPY.timeout,
        SOLVE_COPY.fail,
    )
