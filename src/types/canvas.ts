import type { Board, ConflictMask, Position } from "./board"

/** canvas 棋盘渲染入参 */
export interface RenderParams {
    canvas: HTMLCanvasElement
    board: Board
    selected: Position | null
    conflictMask: ConflictMask
    boxSize: number
    /** 缩放倍数，默认 1 */
    zoom?: number
}