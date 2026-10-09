import type { Board, Position } from "./board"

/** canvas 棋盘渲染入参 */
export interface RenderParams {
    canvas: HTMLCanvasElement
    board: Board
    selected: Position | null
    conflictSet: Set<string>
    boxSize: number
    /** 缩放倍数，默认 1 */
    zoom?: number
}