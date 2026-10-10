import type { Board, ConflictMask, Position } from "./board"

/** canvas 棋盘渲染入参 */
export interface RenderParams {
    canvas: HTMLCanvasElement
    board: Board
    boxSize: number

    selected?: Position | null
    conflictMask?: ConflictMask
    zoom?: number
    interactive?: boolean
}