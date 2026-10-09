import type { PuzzleData } from "./puzzle"

/** 主线程 → Worker */
export interface GenerateRequest {
    boxSize: number
    blanks: number
}

/** Worker → 主线程：ok 为真带结果，否则带错误文案 */
export type GenerateResponse =
    | { ok: true; result: PuzzleData }
    | { ok: false; error: string }
