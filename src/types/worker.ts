import type { NumBoard } from "./board"
import type { PuzzleData } from "./puzzle"

/**
 * 主线程 → Worker：用 kind 区分两种活
 * 生成与多解都可能很慢（回溯），一律丢进 Worker，别卡住 UI
 */
export type WorkerRequest =
    | { kind: 'generate'; boxSize: number; blanks: number }
    | { kind: 'solve'; board: NumBoard; maxSolutions: number }

/** Worker → 主线程：ok 为真带结果，否则带错误文案（两种活的响应分开写，调用方不用猜） */
export type GenerateResponse =
    | { ok: true; result: PuzzleData }
    | { ok: false; error: string }

/** 多解：result = 解列表（空数组 = 无解，由调用方决定怎么提示） */
export type SolveResponse =
    | { ok: true; result: NumBoard[] }
    | { ok: false; error: string }
