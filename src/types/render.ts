import type { Board, ConflictMask, Position } from './board'

/**
 * 棋盘渲染入参：BoardView props / 页面 boardParams / useBoardCanvas input 共用这一份契约
 * 不含 canvas —— canvas 是函数参数（见 render/board.ts 的 renderBoard）
 */
export interface BoardRenderInput {
    board: Board
    boxSize: number
    selected?: Position | null
    conflictMask?: ConflictMask
    zoom?: number
    interactive?: boolean
}
